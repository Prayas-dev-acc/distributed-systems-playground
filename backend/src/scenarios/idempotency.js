import { Router } from "express";
import { query, getClient } from "../db/index.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRouter({ io, SERVER_ID }) {
  const router = Router();

  // ── GET /accounts ────────────────────────────────────────────────────────────
  router.get("/accounts", async (_req, res) => {
    try {
      const { rows } = await query(
        "SELECT id, owner AS name, balance FROM accounts ORDER BY id"
      );
      res.json({ accounts: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /transfer-history ─────────────────────────────────────────────────────
  router.get("/transfer-history", async (_req, res) => {
    try {
      const { rows } = await query(
        `SELECT
           tr.id,
           tr.request_id,
           fa.owner  AS from_name,
           ta.owner  AS to_name,
           tr.from_account_id,
           tr.to_account_id,
           tr.amount,
           tr.status,
           tr.server_id,
           tr.created_at
         FROM transfer_requests tr
         JOIN accounts fa ON fa.id = tr.from_account_id
         JOIN accounts ta ON ta.id = tr.to_account_id
         ORDER BY tr.created_at DESC
         LIMIT 50`
      );
      res.json({ transfers: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /transfer ────────────────────────────────────────────────────────────
  // Body: { requestId, fromAccountId, toAccountId, amount, simulateTimeout }
  router.post("/transfer", async (req, res) => {
    const { requestId, fromAccountId, toAccountId, amount, simulateTimeout } = req.body;

    if (!requestId || !fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ error: "Missing required fields", serverId: SERVER_ID });
    }

    // ── 1. Idempotency check ─────────────────────────────────────────────────
    const { rows: existing } = await query(
      `SELECT tr.*, fa.owner AS from_name, ta.owner AS to_name
       FROM transfer_requests tr
       JOIN accounts fa ON fa.id = tr.from_account_id
       JOIN accounts ta ON ta.id = tr.to_account_id
       WHERE tr.request_id = $1`,
      [requestId]
    );

    if (existing.length > 0) {
      const { rows: accounts } = await query(
        "SELECT id, owner AS name, balance FROM accounts ORDER BY id"
      );
      return res.json({
        status: "already_processed",
        transfer: existing[0],
        accounts,
        message: "Idempotent: this request was already processed — no duplicate transfer.",
        serverId: SERVER_ID,
      });
    }

    // ── 2. Execute transfer inside a transaction ───────────────────────────────
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Lock both rows in consistent order to avoid deadlock
      const lockIds = [fromAccountId, toAccountId].sort((a, b) => a - b);
      const { rows: locked } = await client.query(
        `SELECT id, owner AS name, balance FROM accounts WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
        [lockIds]
      );

      const from = locked.find((r) => r.id === fromAccountId);
      const to   = locked.find((r) => r.id === toAccountId);

      if (!from || !to) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Account not found", serverId: SERVER_ID });
      }

      if (from.balance < amount) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "failed",
          error: `Insufficient funds — ${from.name} has $${from.balance}, needs $${amount}`,
          requestId,
          serverId: SERVER_ID,
        });
      }

      await client.query(
        "UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
        [amount, fromAccountId]
      );
      await client.query(
        "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        [amount, toAccountId]
      );

      const { rows: [transfer] } = await client.query(
        `INSERT INTO transfer_requests (request_id, from_account_id, to_account_id, amount, status, server_id)
         VALUES ($1, $2, $3, $4, 'completed', $5)
         RETURNING *`,
        [requestId, fromAccountId, toAccountId, amount, SERVER_ID]
      );

      await client.query("COMMIT");

      const { rows: updatedAccounts } = await query(
        "SELECT id, owner AS name, balance FROM accounts ORDER BY id"
      );

      io.emit("scenario2:transfer_completed", {
        requestId,
        fromName: from.name,
        toName: to.name,
        fromAccountId,
        toAccountId,
        amount,
        serverId: SERVER_ID,
      });

      // ── 3. Simulate timeout: transfer done, response deliberately delayed ────
      // The client will abort after 5s. The DB change already committed.
      if (simulateTimeout) {
        await sleep(8_000);
      }

      res.json({
        status: "completed",
        transfer: { ...transfer, from_name: from.name, to_name: to.name },
        accounts: updatedAccounts,
        serverId: SERVER_ID,
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      res.status(500).json({ error: err.message, serverId: SERVER_ID });
    } finally {
      client.release();
    }
  });

  // ── POST /reset ──────────────────────────────────────────────────────────────
  router.post("/reset", async (_req, res) => {
    try {
      await query("DELETE FROM transfer_requests");
      await query("UPDATE accounts SET balance = 1000 WHERE owner = 'Account A'");
      await query("UPDATE accounts SET balance = 500  WHERE owner = 'Account B'");
      io.emit("scenario2:reset", { serverId: SERVER_ID });
      const { rows: accounts } = await query(
        "SELECT id, owner AS name, balance FROM accounts ORDER BY id"
      );
      res.json({ success: true, accounts, serverId: SERVER_ID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

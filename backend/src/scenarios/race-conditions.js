import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/index.js";
import redis from "../redis.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Atomic acquire via SET NX EX — returns true if this server got the lock
async function acquireLock(key, ttlSeconds, ownerId) {
  const result = await redis.set(`lock:${key}`, ownerId, "NX", "EX", ttlSeconds);
  return result === "OK";
}

// Lua script: only release if we still own the lock
const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async function releaseLock(key, ownerId) {
  return redis.eval(RELEASE_SCRIPT, 1, `lock:${key}`, ownerId);
}

export function createRouter({ io, SERVER_ID }) {
  const router = Router();

  // ── GET /counter ────────────────────────────────────────────────────────────
  router.get("/counter", async (_req, res) => {
    try {
      const { rows } = await query("SELECT value FROM counter WHERE id = 1");
      res.json({ value: rows[0]?.value ?? 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /db-state ────────────────────────────────────────────────────────────
  router.get("/db-state", async (_req, res) => {
    try {
      const { rows } = await query("SELECT id, value FROM counter");
      res.json({ rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /reset ──────────────────────────────────────────────────────────────
  router.post("/reset", async (_req, res) => {
    try {
      await query("UPDATE counter SET value = 0 WHERE id = 1");
      await redis.del("lock:counter");
      io.emit("scenario1:reset", { serverId: SERVER_ID });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /increment ──────────────────────────────────────────────────────────
  router.post("/increment", async (req, res) => {
    const lockingEnabled = req.body.lockingEnabled === true;

    try {
      let oldValue, newValue;
      let locked = false;
      let lockWaitMs = 0;

      if (!lockingEnabled) {
        // ── Unlocked path: classic read-modify-write race ──────────────────────
        const { rows } = await query("SELECT value FROM counter WHERE id = 1");
        oldValue = rows[0].value;
        // Deliberate delay: gives other servers time to also read the same stale value
        await sleep(20 + Math.random() * 60);
        await query("UPDATE counter SET value = $1 WHERE id = 1", [oldValue + 1]);
        newValue = oldValue + 1;
      } else {
        // ── Locked path: poll until acquired, unique token per request ─────────
        // Unique token prevents a timed-out request from accidentally releasing
        // a lock that was re-acquired by a different request.
        const lockToken = `${SERVER_ID}:${uuidv4()}`;
        const MAX_WAIT_MS = 30_000;
        const lockStart = Date.now();
        let acquired = false;
        let attempt = 0;

        while (Date.now() - lockStart < MAX_WAIT_MS) {
          acquired = await acquireLock("counter", 5, lockToken);
          if (acquired) break;

          io.emit("scenario1:lock_wait", { serverId: SERVER_ID, attempt });
          // Random jitter (15–50ms) spreads retries and prevents thundering herd
          await sleep(15 + Math.random() * 35);
          attempt++;
        }

        lockWaitMs = Date.now() - lockStart;

        if (!acquired) {
          return res.status(503).json({
            error: "Lock wait timed out after 30s",
            serverId: SERVER_ID,
          });
        }

        io.emit("scenario1:lock_acquired", { serverId: SERVER_ID, lockWaitMs });

        try {
          const { rows } = await query("SELECT value FROM counter WHERE id = 1");
          oldValue = rows[0].value;
          // Same delay as unlocked path so comparison is fair
          await sleep(20 + Math.random() * 60);
          await query("UPDATE counter SET value = $1 WHERE id = 1", [oldValue + 1]);
          newValue = oldValue + 1;
          locked = true;
        } finally {
          await releaseLock("counter", lockToken);
          io.emit("scenario1:lock_released", { serverId: SERVER_ID });
        }
      }

      const payload = {
        serverId: SERVER_ID,
        oldValue,
        newValue,
        locked,
        lockWaitMs,
        timestamp: new Date().toISOString(),
      };
      io.emit("scenario1:increment", payload);

      res.json({ success: true, value: newValue, oldValue, serverId: SERVER_ID, wasLocked: locked });
    } catch (err) {
      res.status(500).json({ error: err.message, serverId: SERVER_ID });
    }
  });

  return router;
}

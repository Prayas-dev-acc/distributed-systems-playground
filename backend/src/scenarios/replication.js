import { Router } from "express";
import Redis from "ioredis";
import { query } from "../db/index.js";
import redis from "../redis.js";

const REPLI_CHANNEL = "scenario4:replication";
const RESET_CHANNEL = "scenario4:reset";
const INITIAL_VALUE = "initial_value";

// ── Dedicated subscriber connection ───────────────────────────────────────────
// Redis pub/sub requires a separate client from the one used for commands.
// We use a module-level singleton so it is shared across hot-reloads but
// created only once per process (each Docker container = one process).
const subClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  retryStrategy: (times) => Math.min(times * 200, 3000),
  enableReadyCheck: false,
});

subClient.on("error", (err) =>
  console.error("[Replication-Sub] Redis error:", err.message)
);

// Message handler is injected by createRouter so it has access to io / state
let onMessage = null;
subClient.on("message", (channel, raw) => {
  if (onMessage) onMessage(channel, raw);
});

// Subscribe once — ioredis queues this until the connection is ready
subClient.subscribe(REPLI_CHANNEL, RESET_CHANNEL).catch((err) =>
  console.error("[Replication-Sub] subscribe error:", err.message)
);

// ── Router factory ────────────────────────────────────────────────────────────
export function createRouter({ io, SERVER_ID }) {
  const PORT    = parseInt(process.env.PORT || "3001");
  const isPrimary = PORT === 3001;

  // ── In-memory replica state (irrelevant on primary) ───────────────────────
  let replicaValue  = INITIAL_VALUE;
  let syncProgress  = 100;
  let isSyncing     = false;
  let lastSyncTime  = null;
  let syncTimerId   = null;

  function startReplication(targetValue, delayMs) {
    clearInterval(syncTimerId);
    syncTimerId   = null;
    isSyncing     = true;
    syncProgress  = 0;

    io.emit("scenario4:replication_started", {
      serverId: SERVER_ID,
      targetValue,
      delayMs,
    });

    const STEPS      = 10;
    const intervalMs = Math.max(50, delayMs / STEPS);
    let   step       = 0;

    syncTimerId = setInterval(() => {
      step++;
      syncProgress = Math.min(100, Math.round((step / STEPS) * 100));
      io.emit("scenario4:replication_progress", {
        serverId: SERVER_ID,
        progress: syncProgress,
      });

      if (step >= STEPS) {
        clearInterval(syncTimerId);
        syncTimerId   = null;
        replicaValue  = targetValue;
        isSyncing     = false;
        lastSyncTime  = new Date().toISOString();
        io.emit("scenario4:replication_complete", {
          serverId: SERVER_ID,
          value:    targetValue,
        });
      }
    }, intervalMs);
  }

  // Wire up the pub/sub message handler for this server's role
  onMessage = (channel, raw) => {
    try {
      const payload = JSON.parse(raw);
      if (channel === REPLI_CHANNEL) {
        if (isPrimary) return; // primary is the source, not the target
        startReplication(payload.value, payload.replicationDelay);
      } else if (channel === RESET_CHANNEL) {
        clearInterval(syncTimerId);
        syncTimerId  = null;
        replicaValue = INITIAL_VALUE;
        syncProgress = 100;
        isSyncing    = false;
        lastSyncTime = null;
        io.emit("scenario4:reset", { serverId: SERVER_ID });
      }
    } catch (err) {
      console.error("[Replication] bad pub/sub message:", err.message);
    }
  };

  const router = Router();

  // ── GET /status ─────────────────────────────────────────────────────────────
  router.get("/status", async (_req, res) => {
    try {
      let value = null;
      if (isPrimary) {
        const { rows } = await query(
          "SELECT value, updated_at FROM primary_data WHERE id = 1"
        );
        value = rows[0]?.value ?? INITIAL_VALUE;
      } else {
        value = replicaValue;
      }

      res.json({
        serverId: SERVER_ID,
        port: PORT,
        isPrimary,
        value,
        syncProgress: isPrimary ? 100 : syncProgress,
        isSyncing:    isPrimary ? false : isSyncing,
        lastSyncTime,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /read ───────────────────────────────────────────────────────────────
  router.get("/read", async (_req, res) => {
    try {
      if (isPrimary) {
        const { rows } = await query(
          "SELECT value, updated_at FROM primary_data WHERE id = 1"
        );
        return res.json({
          source:   "primary",
          value:    rows[0]?.value ?? INITIAL_VALUE,
          serverId: SERVER_ID,
          updatedAt: rows[0]?.updated_at,
        });
      }
      res.json({
        source:       "replica",
        value:        replicaValue,
        serverId:     SERVER_ID,
        syncProgress,
        isSyncing,
        lastSyncTime,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /write ─────────────────────────────────────────────────────────────
  // Only the primary accepts writes. Replicas return 400.
  router.post("/write", async (req, res) => {
    if (!isPrimary) {
      return res.status(400).json({
        error: "This is a replica — writes are only accepted by the primary (server-1)",
        serverId: SERVER_ID,
      });
    }

    const { value, replicationDelay = 3000 } = req.body;
    if (!value?.trim()) {
      return res.status(400).json({ error: "value is required" });
    }

    try {
      const { rows } = await query(
        "UPDATE primary_data SET value = $1, updated_at = NOW() WHERE id = 1 RETURNING *",
        [value.trim()]
      );

      const updatedAt = rows[0].updated_at;

      // Notify browser clients connected to this server
      io.emit("scenario4:primary_write", {
        value,
        updatedAt,
        serverId: SERVER_ID,
        replicationDelay,
      });

      // Notify replica servers via Redis pub/sub
      await redis.publish(
        REPLI_CHANNEL,
        JSON.stringify({ value, replicationDelay })
      );

      res.json({
        status: "written",
        value,
        updatedAt,
        serverId: SERVER_ID,
        replicationDelay,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /reset ─────────────────────────────────────────────────────────────
  // Call on primary only — it resets DB and broadcasts reset to all replicas
  // via Redis pub/sub so they reset their in-memory state.
  router.post("/reset", async (_req, res) => {
    try {
      if (isPrimary) {
        await query(
          "UPDATE primary_data SET value = $1, updated_at = NOW() WHERE id = 1",
          [INITIAL_VALUE]
        );
        await redis.publish(RESET_CHANNEL, JSON.stringify({}));
        io.emit("scenario4:primary_write", {
          value: INITIAL_VALUE,
          serverId: SERVER_ID,
          replicationDelay: 0,
        });
      }
      res.json({ success: true, serverId: SERVER_ID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

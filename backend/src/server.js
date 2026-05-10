import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { query } from "./db/index.js";
import redis from "./redis.js";
import { createRouter as raceConditionsRouter } from "./scenarios/race-conditions.js";
import { createRouter as loadBalancingRouter } from "./scenarios/load-balancing.js";
import { createRouter as idempotencyRouter } from "./scenarios/idempotency.js";
import { createRouter as replicationRouter } from "./scenarios/replication.js";
import { createRouter as partitionsRouter } from "./scenarios/partitions.js";

const PORT = parseInt(process.env.PORT || "3001");
const SERVER_ID = process.env.SERVER_ID || `server-${PORT}`;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// Log every request and emit to connected clients
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on("finish", () => {
    const entry = {
      serverId: SERVER_ID,
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
    io.emit("request_log", entry);
  });
  next();
});

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const checks = { server: "ok", db: "unknown", redis: "unknown" };

  try {
    await query("SELECT 1");
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  res.status(healthy ? 200 : 503).json({
    serverId: SERVER_ID,
    port: PORT,
    status: healthy ? "healthy" : "degraded",
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Info ─────────────────────────────────────────────────────────────────────
app.get("/info", (req, res) => {
  res.json({ serverId: SERVER_ID, port: PORT, pid: process.pid });
});

// ── Scenarios ─────────────────────────────────────────────────────────────────
// Each scenario exports createRouter({ io, SERVER_ID }) to avoid circular deps
app.use("/scenarios/race-conditions", raceConditionsRouter({ io, SERVER_ID }));
app.use("/scenarios/load-balancing", loadBalancingRouter({ io, SERVER_ID }));
app.use("/scenarios/idempotency", idempotencyRouter({ io, SERVER_ID }));
app.use("/scenarios/replication", replicationRouter({ io, SERVER_ID }));
app.use("/scenarios/partitions", partitionsRouter({ io, SERVER_ID }));

// ── WebSocket ─────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.emit("server_info", { serverId: SERVER_ID, port: PORT });
  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  await redis.connect().catch(() => {});

  httpServer.listen(PORT, () => {
    console.log(`[Server] ${SERVER_ID} listening on port ${PORT}`);
  });
}

start();

export { io, SERVER_ID };

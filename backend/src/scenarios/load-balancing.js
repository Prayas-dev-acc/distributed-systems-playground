import { Router } from "express";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRouter({ io, SERVER_ID }) {
  // ── Per-instance state (each Docker container has its own copy) ─────────────
  let isAlive = true;
  let requestCount = 0;
  const startTime = Date.now();

  const router = Router();

  // ── GET /health ──────────────────────────────────────────────────────────────
  // Killed servers stall 10s so the frontend's 5s AbortSignal fires first
  router.get("/health", async (_req, res) => {
    if (!isAlive) {
      await sleep(10_000);
      return res.status(503).json({ serverId: SERVER_ID, status: "down" });
    }
    res.json({
      serverId: SERVER_ID,
      status: "healthy",
      requestCount,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // ── GET /stats ───────────────────────────────────────────────────────────────
  router.get("/stats", (_req, res) => {
    res.json({
      serverId: SERVER_ID,
      isAlive,
      requestCount,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // ── POST /process-request ────────────────────────────────────────────────────
  router.post("/process-request", async (_req, res) => {
    if (!isAlive) {
      return res.status(503).json({ serverId: SERVER_ID, error: "Server is down" });
    }

    requestCount++;
    const workMs = 50 + Math.floor(Math.random() * 150);
    await sleep(workMs);

    io.emit("scenario5:request_processed", {
      serverId: SERVER_ID,
      requestCount,
      responseTime: workMs,
    });

    res.json({
      serverId: SERVER_ID,
      message: "Request processed",
      requestCount,
      responseTime: workMs,
    });
  });

  // ── POST /kill ───────────────────────────────────────────────────────────────
  router.post("/kill", (_req, res) => {
    isAlive = false;
    io.emit("scenario5:server_killed", { serverId: SERVER_ID });
    res.json({ serverId: SERVER_ID, status: "killed" });
  });

  // ── POST /restart ────────────────────────────────────────────────────────────
  router.post("/restart", (_req, res) => {
    isAlive = true;
    io.emit("scenario5:server_restarted", { serverId: SERVER_ID });
    res.json({ serverId: SERVER_ID, status: "restarted" });
  });

  // ── POST /reset ──────────────────────────────────────────────────────────────
  router.post("/reset", (_req, res) => {
    isAlive = true;
    requestCount = 0;
    io.emit("scenario5:reset", { serverId: SERVER_ID });
    res.json({ success: true, serverId: SERVER_ID });
  });

  return router;
}

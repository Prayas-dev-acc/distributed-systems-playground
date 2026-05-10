import { Router } from "express";
import redis from "../redis.js";

const LEADER_KEY = "scenario3:leader";
const TERM_KEY   = "scenario3:term";
const VALUE_KEY  = "scenario3:cluster_value";
const HB_KEY     = (id) => `scenario3:hb:${id}`;
const INITIAL_VALUE = "initial";
const ALL_SERVER_IDS = ["server-1", "server-2", "server-3"];

function peerUrl(num) {
  return process.env[`PEER_${num}_URL`] ?? `http://backend-${num}:${3000 + num}`;
}

export function createRouter({ io, SERVER_ID }) {
  const PORT       = parseInt(process.env.PORT || "3001");
  const SERVER_NUM = PORT - 3000;
  const PEER_NUMS  = [1, 2, 3].filter((n) => n !== SERVER_NUM);

  // ── In-memory per-server state ────────────────────────────────────────────────
  let isPartitioned = false;
  let isLeader      = false;
  let term          = 0;
  let votedFor      = null; // { term, candidateId }
  let hbTimer       = null;
  let detectTimer   = null;
  let electionTimer = null;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  async function getRedisTerm() {
    const v = await redis.get(TERM_KEY);
    return v ? parseInt(v) : 0;
  }

  function jitter() { return 500 + Math.random() * 1000; }

  function startHeartbeat() {
    clearInterval(hbTimer);
    hbTimer = setInterval(async () => {
      if (isPartitioned || !isLeader) return;
      try {
        await redis.set(HB_KEY(SERVER_ID), Date.now().toString(), "EX", 10);
        io.emit("scenario3:heartbeat", { leaderId: SERVER_ID, term });
      } catch { /* ignore */ }
    }, 2000);
  }

  async function becomeLeader(newTerm) {
    isLeader = true;
    term     = newTerm;
    votedFor = null;
    await redis.mset(LEADER_KEY, SERVER_ID, TERM_KEY, String(newTerm));
    io.emit("scenario3:leader_elected", { leaderId: SERVER_ID, term: newTerm });
    console.log(`[Partitions] ${SERVER_ID} elected leader term=${newTerm}`);
    startHeartbeat();
  }

  async function stepDown(newTerm) {
    const wasLeader = isLeader;
    isLeader = false;
    term     = newTerm;
    votedFor = null;
    clearInterval(hbTimer);
    hbTimer = null;
    if (wasLeader) {
      io.emit("scenario3:leader_stepped_down", { serverId: SERVER_ID, newTerm });
      console.log(`[Partitions] ${SERVER_ID} stepped down, new term=${newTerm}`);
    }
  }

  async function runElection() {
    if (isPartitioned) return;
    if (electionTimer) { clearTimeout(electionTimer); electionTimer = null; }

    const rt    = await getRedisTerm().catch(() => 0);
    const nTerm = Math.max(term, rt) + 1;
    term        = nTerm;
    votedFor    = { term: nTerm, candidateId: SERVER_ID };
    let votes   = 1;

    io.emit("scenario3:election_started", { candidateId: SERVER_ID, term: nTerm });
    console.log(`[Partitions] ${SERVER_ID} election term=${nTerm}`);

    await Promise.allSettled(
      PEER_NUMS.map(async (num) => {
        try {
          const r = await fetch(`${peerUrl(num)}/scenarios/partitions/request-vote`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ candidateId: SERVER_ID, term: nTerm }),
            signal:  AbortSignal.timeout(2000),
          });
          if (!r.ok) return;
          const d = await r.json();
          if (d.voteGranted) votes++;
        } catch { /* peer unreachable */ }
      })
    );

    if (isPartitioned) return;

    if (votes >= 2) {
      await becomeLeader(nTerm);
    } else {
      electionTimer = setTimeout(() => { electionTimer = null; runElection(); }, jitter() + 2000);
    }
  }

  function scheduleElection() {
    if (electionTimer) return;
    electionTimer = setTimeout(() => { electionTimer = null; runElection(); }, jitter());
  }

  function startDetectionLoop() {
    clearInterval(detectTimer);
    detectTimer = setInterval(async () => {
      if (isPartitioned || isLeader) return;
      try {
        const leaderId = await redis.get(LEADER_KEY);
        if (!leaderId) { scheduleElection(); return; }

        const hb = await redis.get(HB_KEY(leaderId));
        if (!hb)  { scheduleElection(); return; }

        if (Date.now() - parseInt(hb) > 5000) scheduleElection();
      } catch { /* ignore */ }
    }, 3000);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────────
  setTimeout(async () => {
    try {
      term = await getRedisTerm();
      startDetectionLoop();
      setTimeout(async () => {
        const lead = await redis.get(LEADER_KEY).catch(() => null);
        if (!lead) scheduleElection();
      }, SERVER_NUM * 1200);
    } catch (e) {
      console.error("[Partitions] init error:", e.message);
    }
  }, 3000);

  // ── Router ────────────────────────────────────────────────────────────────────
  const router = Router();

  // GET /status
  router.get("/status", async (_req, res) => {
    try {
      const [leaderId, rt, val, ...hbs] = await Promise.all([
        redis.get(LEADER_KEY),
        redis.get(TERM_KEY),
        redis.get(VALUE_KEY),
        ...ALL_SERVER_IDS.map((id) => redis.get(HB_KEY(id))),
      ]);

      const now = Date.now();
      const heartbeatAgeMs = Object.fromEntries(
        ALL_SERVER_IDS.map((id, i) => [id, hbs[i] ? now - parseInt(hbs[i]) : null])
      );

      res.json({
        serverId:      SERVER_ID,
        isLeader,
        isPartitioned,
        term,
        clusterValue:  val ?? INITIAL_VALUE,
        currentLeader: leaderId,
        redisTerm:     rt ? parseInt(rt) : 0,
        heartbeatAgeMs,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /read
  router.get("/read", async (_req, res) => {
    try {
      const [val, leaderId] = await Promise.all([redis.get(VALUE_KEY), redis.get(LEADER_KEY)]);
      res.json({ value: val ?? INITIAL_VALUE, readFrom: SERVER_ID, isLeader, isPartitioned, term, currentLeader: leaderId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /write — only leaders accept
  router.post("/write", async (req, res) => {
    if (!isLeader) {
      const lead = await redis.get(LEADER_KEY).catch(() => null);
      return res.status(403).json({ error: "Not the leader", currentLeader: lead, serverId: SERVER_ID, term });
    }
    const { value } = req.body;
    if (!value?.trim()) return res.status(400).json({ error: "value required" });
    try {
      await redis.set(VALUE_KEY, value.trim());
      io.emit("scenario3:value_written", { serverId: SERVER_ID, value: value.trim(), term, isPartitioned });
      res.json({ status: "written", value: value.trim(), term, serverId: SERVER_ID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /partition — isolate this server; intentionally keeps isLeader=true for split brain
  router.post("/partition", (_req, res) => {
    isPartitioned = true;
    clearTimeout(electionTimer);
    electionTimer = null;
    clearInterval(hbTimer);
    hbTimer = null;
    io.emit("scenario3:server_partitioned", { serverId: SERVER_ID, wasLeader: isLeader });
    console.log(`[Partitions] ${SERVER_ID} partitioned (wasLeader=${isLeader})`);
    res.json({ status: "partitioned", serverId: SERVER_ID, wasLeader: isLeader });
  });

  // POST /heal — rejoin cluster; step down if a higher term exists in Redis
  router.post("/heal", async (_req, res) => {
    isPartitioned = false;
    try {
      const rt = await getRedisTerm();
      if (rt > term) await stepDown(rt);
      io.emit("scenario3:server_healed", { serverId: SERVER_ID, term });
    } catch { /* ignore */ }
    res.json({ status: "healed", serverId: SERVER_ID, term });
  });

  // POST /request-vote — Raft-style vote request from a peer
  router.post("/request-vote", async (req, res) => {
    if (isPartitioned) return res.status(503).json({ error: "partitioned" });

    const { candidateId, term: cTerm } = req.body;

    if (cTerm < term) {
      return res.json({ voteGranted: false, term, voterId: SERVER_ID, reason: "stale term" });
    }

    if (cTerm > term) await stepDown(cTerm);

    const alreadyVoted = votedFor && votedFor.term === cTerm && votedFor.candidateId !== candidateId;
    if (alreadyVoted) {
      return res.json({ voteGranted: false, term, voterId: SERVER_ID, reason: "already voted" });
    }

    votedFor = { term: cTerm, candidateId };
    io.emit("scenario3:vote_cast", { voterId: SERVER_ID, candidateId, term: cTerm });
    res.json({ voteGranted: true, term: cTerm, voterId: SERVER_ID });
  });

  // POST /reset
  router.post("/reset", async (_req, res) => {
    try {
      isLeader = false;
      isPartitioned = false;
      term = 0;
      votedFor = null;
      clearInterval(hbTimer);
      clearInterval(detectTimer);
      clearTimeout(electionTimer);
      hbTimer = detectTimer = electionTimer = null;

      await redis.del(LEADER_KEY, TERM_KEY, VALUE_KEY, ...ALL_SERVER_IDS.map(HB_KEY));
      io.emit("scenario3:reset", { serverId: SERVER_ID });

      setTimeout(() => {
        term = 0;
        startDetectionLoop();
        setTimeout(async () => {
          const lead = await redis.get(LEADER_KEY).catch(() => null);
          if (!lead) scheduleElection();
        }, SERVER_NUM * 1200);
      }, 1000);

      res.json({ success: true, serverId: SERVER_ID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

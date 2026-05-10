import { useState, useEffect, useCallback, useRef } from "react";

const SERVER_URLS = [
  import.meta.env.VITE_BACKEND_1_URL || "http://localhost:3001",
  import.meta.env.VITE_BACKEND_2_URL || "http://localhost:3002",
  import.meta.env.VITE_BACKEND_3_URL || "http://localhost:3003",
];

const SERVERS = [
  { id: "server-1", port: 3001, text: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/5",    bar: "bg-blue-500",    ring: "border-blue-500/50"    },
  { id: "server-2", port: 3002, text: "text-purple-400",  border: "border-purple-500/30",  bg: "bg-purple-500/5",  bar: "bg-purple-500",  ring: "border-purple-500/50"  },
  { id: "server-3", port: 3003, text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5", bar: "bg-emerald-500", ring: "border-emerald-500/50" },
];

const INIT_STATS = () => ({
  "server-1": { requests: 0, lockStatus: "idle", lastOp: null },
  "server-2": { requests: 0, lockStatus: "idle", lastOp: null },
  "server-3": { requests: 0, lockStatus: "idle", lastOp: null },
});

function LockBadge({ status }) {
  if (status === "waiting")  return <span className="badge badge-amber">⏳ waiting</span>;
  if (status === "acquired") return <span className="badge badge-green">🔒 locked</span>;
  return <span className="text-tertiary text-xs">—</span>;
}

export default function Scenario1RaceConditions({ serverHealth, sockets }) {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [isRunning, setIsRunning]     = useState(false);
  const [counter, setCounter]         = useState(null);
  const [serverStats, setServerStats] = useState(INIT_STATS());
  const [runResult, setRunResult]     = useState(null);
  const [liveEvents, setLiveEvents]   = useState([]);
  const runningRef = useRef(false);

  const fetchCounter = useCallback(async () => {
    try {
      const r = await fetch(`${SERVER_URLS[0]}/scenarios/race-conditions/counter`);
      const { value } = await r.json();
      setCounter(value);
      return value;
    } catch { return null; }
  }, []);

  useEffect(() => {
    fetchCounter();
    const id = setInterval(fetchCounter, 1500);
    return () => clearInterval(id);
  }, [fetchCounter]);

  useEffect(() => {
    if (!sockets?.length) return;
    const cleanup = sockets.flatMap((socket) => {
      const onIncrement = (d) => {
        setServerStats((prev) => ({
          ...prev,
          [d.serverId]: { requests: (prev[d.serverId]?.requests || 0) + 1, lockStatus: "idle", lastOp: { old: d.oldValue, next: d.newValue } },
        }));
        setLiveEvents((prev) => [{ ...d, type: "increment" }, ...prev].slice(0, 30));
      };
      const onLockWait     = (d) => setServerStats((prev) => ({ ...prev, [d.serverId]: { ...prev[d.serverId], lockStatus: "waiting"  } }));
      const onLockAcquired = (d) => {
        setServerStats((prev) => ({ ...prev, [d.serverId]: { ...prev[d.serverId], lockStatus: "acquired" } }));
        setLiveEvents((prev) => [{ ...d, type: "lock_acquired" }, ...prev].slice(0, 30));
      };
      const onLockReleased = (d) => setServerStats((prev) => ({ ...prev, [d.serverId]: { ...prev[d.serverId], lockStatus: "idle" } }));
      const onReset = () => { setServerStats(INIT_STATS()); setRunResult(null); setLiveEvents([]); setCounter(0); };

      socket.on("scenario1:increment",     onIncrement);
      socket.on("scenario1:lock_wait",     onLockWait);
      socket.on("scenario1:lock_acquired", onLockAcquired);
      socket.on("scenario1:lock_released", onLockReleased);
      socket.on("scenario1:reset",         onReset);
      return [
        () => socket.off("scenario1:increment",     onIncrement),
        () => socket.off("scenario1:lock_wait",     onLockWait),
        () => socket.off("scenario1:lock_acquired", onLockAcquired),
        () => socket.off("scenario1:lock_released", onLockReleased),
        () => socket.off("scenario1:reset",         onReset),
      ];
    });
    return () => cleanup.forEach((fn) => fn());
  }, [sockets]);

  const sendRequests = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setRunResult(null);
    setServerStats(INIT_STATS());
    setLiveEvents([]);

    const initial  = await fetchCounter() ?? 0;
    const expected = initial + 100;

    const reqs = Array.from({ length: 100 }, (_, i) =>
      fetch(`${SERVER_URLS[i % 3]}/scenarios/race-conditions/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockingEnabled: lockEnabled }),
      }).then((r) => r.json()).catch(() => null)
    );
    await Promise.allSettled(reqs);
    await new Promise((r) => setTimeout(r, 300));
    const actual = await fetchCounter() ?? 0;

    setRunResult({ expected, actual, lost: expected - actual });
    setIsRunning(false);
    runningRef.current = false;
  };

  const reset = async () => {
    if (isRunning) return;
    await fetch(`${SERVER_URLS[0]}/scenarios/race-conditions/reset`, { method: "POST" });
    await fetchCounter();
  };

  const raceDetected = runResult && runResult.lost > 0;
  const totalSent = Object.values(serverStats).reduce((s, v) => s + v.requests, 0);

  return (
    <div className="space-y-4">

      {/* ── Server panels ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {SERVERS.map((meta) => {
          const health = serverHealth?.find((s) => s.id === meta.id);
          const stats  = serverStats[meta.id];
          const isUp   = health?.status === "healthy";

          return (
            <div key={meta.id} className={`rounded-card border-2 p-4 space-y-3 transition-all duration-200 ${meta.bg} ${meta.border}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${meta.text}`}>{meta.id}</span>
                <span className={`badge ${isUp ? "badge-green" : "badge-red"}`}>{isUp ? "UP" : "DOWN"}</span>
              </div>
              <div className="text-tertiary text-xs font-mono">:{meta.port}</div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Requests this run</span>
                  <span className={`font-mono font-bold ${meta.text}`}>{stats.requests}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Last write</span>
                  <span className="font-mono text-secondary">
                    {stats.lastOp ? `${stats.lastOp.old} → ${stats.lastOp.next}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-secondary">Lock status</span>
                  <LockBadge status={stats.lockStatus} />
                </div>
              </div>

              <div className="h-1 bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${meta.bar}`}
                  style={{ width: `${Math.min(100, stats.requests)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Counter + result ───────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="section-label mb-4">PostgreSQL · counter table</div>
        <div className="flex items-center gap-8">

          {/* Live counter */}
          <div className="text-center min-w-[120px]">
            <div className={`text-7xl font-mono font-bold transition-all duration-300 ${
              raceDetected ? "text-red-400" : runResult ? "text-emerald-400" : "text-primary"
            } ${raceDetected ? "animate-shake" : ""}`}>
              {counter ?? "—"}
            </div>
            <div className="text-xs text-tertiary mt-2">current value</div>
          </div>

          {/* Result */}
          {runResult ? (
            <div className={`flex-1 rounded-card p-4 border animate-fade-in ${
              raceDetected ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"
            }`}>
              <div className="grid grid-cols-3 gap-4 text-center mb-3">
                {[
                  { label: "expected", value: runResult.expected, color: "text-secondary" },
                  { label: "actual",   value: runResult.actual,   color: raceDetected ? "text-red-400" : "text-emerald-400" },
                  { label: "lost",     value: raceDetected ? `-${runResult.lost}` : "0", color: raceDetected ? "text-red-400" : "text-emerald-400" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-tertiary mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className={`text-center text-xs rounded px-3 py-1.5 ${
                raceDetected ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"
              }`}>
                {raceDetected
                  ? `⚠ Race condition detected — ${runResult.lost} increments silently overwritten`
                  : "✓ Distributed lock held — every increment was serialized"}
              </div>
            </div>
          ) : (
            <div className="flex-1 text-center text-tertiary text-sm">
              {isRunning ? `Running ${totalSent}/100 requests…` : "Run the scenario to see expected vs actual"}
            </div>
          )}
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={sendRequests} disabled={isRunning} className="btn-primary px-5 py-2">
          {isRunning ? `⏳ Sending ${totalSent}/100…` : "⚡ Send 100 Concurrent Requests"}
        </button>

        <button
          onClick={() => !isRunning && setLockEnabled((v) => !v)}
          disabled={isRunning}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-button border text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            lockEnabled ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-subtle text-secondary hover:border-prominent"
          }`}
        >
          <div className={`relative w-9 h-5 rounded-full transition-colors ${lockEnabled ? "bg-emerald-600" : "bg-elevated"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${lockEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          {lockEnabled ? "🔒 Locking ON" : "🔓 Locking OFF"}
        </button>

        <button onClick={reset} disabled={isRunning} className="btn-secondary px-4 py-2">Reset</button>
      </div>

      {/* ── Live events + explanation ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-subtle bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-subtle">
            <span className="section-label">Live Events</span>
          </div>
          <div className="h-44 overflow-y-auto">
            {liveEvents.length === 0 ? (
              <p className="text-center text-tertiary text-xs py-8">Events will appear here during a run</p>
            ) : liveEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-subtle/40 text-xs hover:bg-elevated/50 transition-colors">
                <span className={`w-16 truncate font-mono ${
                  e.serverId === "server-1" ? "text-blue-400" :
                  e.serverId === "server-2" ? "text-purple-400" : "text-emerald-400"
                }`}>{e.serverId}</span>
                {e.type === "increment" && (
                  <>
                    <span className="text-tertiary">write</span>
                    <span className="font-mono text-secondary">{e.oldValue} → {e.newValue}</span>
                    {e.locked && <span className="text-emerald-500 ml-auto text-xs">🔒</span>}
                  </>
                )}
                {e.type === "lock_acquired" && (
                  <>
                    <span className="text-emerald-400">lock acquired</span>
                    <span className="text-tertiary ml-auto font-mono">{e.lockWaitMs}ms wait</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-subtle bg-card/50 p-4 text-xs space-y-3">
          <p className="text-primary font-medium text-sm">How the race condition happens</p>
          <p className="text-secondary leading-relaxed">
            <span className="text-red-400 font-medium">Without lock:</span> All 3 servers read value=N
            concurrently, each computes N+1, and all write N+1 back. Only one write persists.
            With 100 requests you lose most of them.
          </p>
          <p className="text-secondary leading-relaxed">
            <span className="text-emerald-400 font-medium">With Redis SETNX lock:</span> Only one server
            holds the lock at a time. Others block with exponential backoff. Slower, but always exact.
          </p>
          <div className="font-mono text-tertiary bg-deep rounded-button p-2.5 text-xs leading-relaxed">
            SET lock:counter {"{server-id}:{uuid}"} NX EX 5
          </div>
        </div>
      </div>
    </div>
  );
}

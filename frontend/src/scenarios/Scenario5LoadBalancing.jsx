import { useState, useEffect, useRef, useCallback } from "react";
import { DbTable } from "../components/DbPanel.jsx";

const SERVER_URLS = [
  import.meta.env.VITE_BACKEND_1_URL || "http://localhost:3001",
  import.meta.env.VITE_BACKEND_2_URL || "http://localhost:3002",
  import.meta.env.VITE_BACKEND_3_URL || "http://localhost:3003",
];
const META = [
  { id: "server-1", port: 3001, urlIdx: 0 },
  { id: "server-2", port: 3002, urlIdx: 1 },
  { id: "server-3", port: 3003, urlIdx: 2 },
];
const C = {
  "server-1": { text: "text-blue-400",    bar: "bg-blue-500",    border: "border-blue-500/40",    bg: "bg-blue-500/5"    },
  "server-2": { text: "text-purple-400",  bar: "bg-purple-500",  border: "border-purple-500/40",  bg: "bg-purple-500/5"  },
  "server-3": { text: "text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/40", bg: "bg-emerald-500/5" },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const initServer = (m) => ({ ...m, status: "checking", requestCount: 0, responseTimes: [], lastHealthMs: null, lastHealthOk: null });

// ── LayeredStatusDot ──────────────────────────────────────────────────────────
function LayeredStatusDot({ status }) {
  const cfg = {
    healthy:  { outer: "bg-emerald-500/15", mid: "bg-emerald-500/35 animate-pulse", inner: "bg-emerald-400", label: "Healthy",  labelColor: "text-emerald-400" },
    down:     { outer: "bg-red-500/15",     mid: "bg-red-500/30",                   inner: "bg-red-400",     label: "Down",     labelColor: "text-red-400"     },
    checking: { outer: "bg-amber-500/15",   mid: "bg-amber-500/30 animate-pulse",   inner: "bg-amber-400",   label: "Checking", labelColor: "text-amber-400"   },
  }[status] ?? { outer: "bg-gray-500/15", mid: "bg-gray-500/30", inner: "bg-gray-500", label: "Unknown", labelColor: "text-tertiary" };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-4 h-4">
        <div className={`absolute w-4 h-4 rounded-full ${cfg.outer}`} />
        <div className={`absolute w-2.5 h-2.5 rounded-full ${cfg.mid}`} />
        <div className={`absolute w-1.5 h-1.5 rounded-full ${cfg.inner}`} />
      </div>
      <span className={`text-xs font-medium ${cfg.labelColor}`}>{cfg.label}</span>
    </div>
  );
}

// ── ConnectorColumn ───────────────────────────────────────────────────────────
function ConnectorColumn({ serverId, isActive, isHealthy }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-px h-6 transition-colors duration-200 ${isActive ? "bg-white" : !isHealthy ? "bg-subtle" : "bg-prominent"}`} />
      <div className="relative h-8 flex justify-center">
        {isActive && (
          <div className={`absolute top-0 w-2.5 h-2.5 rounded-full ${C[serverId].bar} animate-travel`} />
        )}
        <div className={`absolute bottom-0 w-2 h-2 rounded-full transition-colors ${isActive ? "bg-white" : !isHealthy ? "bg-subtle" : "bg-prominent"}`} />
      </div>
    </div>
  );
}

// ── ServerCard ────────────────────────────────────────────────────────────────
function ServerCard({ server, isActive, onKill, onRestart }) {
  const c   = C[server.id];
  const avg = server.responseTimes.length
    ? Math.round(server.responseTimes.reduce((a, b) => a + b, 0) / server.responseTimes.length)
    : null;
  const isDown = server.status === "down";

  return (
    <div className={`rounded-card border-2 p-4 space-y-3 transition-all duration-200 ${
      isActive ? `${c.border} ${c.bg} shadow-card` : isDown ? "border-subtle bg-card opacity-60" : "border-subtle bg-card"
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${c.text}`}>{server.id}</span>
        <LayeredStatusDot status={server.status} />
      </div>
      <div className="font-mono text-xs text-tertiary">:{server.port}</div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-secondary">Requests</span>
          <span className={`font-mono font-bold ${c.text}`}>{server.requestCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">Avg response</span>
          <span className="font-mono text-secondary">{avg !== null ? `${avg}ms` : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">Last health</span>
          <span className={`font-mono ${server.lastHealthOk === true ? "text-emerald-400" : server.lastHealthOk === false ? "text-red-400" : "text-tertiary"}`}>
            {server.lastHealthOk === true ? `✓ ${server.lastHealthMs}ms` : server.lastHealthOk === false ? "✗ timeout" : "—"}
          </span>
        </div>
      </div>

      <div className="h-1 bg-elevated rounded-full overflow-hidden">
        {isActive && <div className={`h-full ${c.bar} animate-pulse rounded-full w-full`} />}
      </div>

      {!isDown ? (
        <button onClick={onKill} className="btn-danger w-full py-1.5 text-xs">Kill Server</button>
      ) : (
        <button onClick={onRestart} className="w-full text-xs py-1.5 rounded-button border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">Restart Server</button>
      )}
    </div>
  );
}

// ── TrafficBar ────────────────────────────────────────────────────────────────
function TrafficBar({ server, total }) {
  const pct = total === 0 ? 0 : Math.round((server.requestCount / total) * 100);
  const c   = C[server.id];
  const isDown = server.status === "down";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={`w-16 font-mono shrink-0 ${c.text}`}>{server.id}</span>
      <div className="flex-1 h-3 bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isDown ? "bg-prominent" : c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-10 text-right font-mono ${isDown ? "text-tertiary" : "text-primary"}`}>{pct}%</span>
      <span className="w-12 text-right font-mono text-tertiary">{server.requestCount}</span>
      {isDown && <span className="text-red-400 text-xs shrink-0">Down</span>}
    </div>
  );
}

// ── HealthLogRow ──────────────────────────────────────────────────────────────
function HealthLogRow({ entry }) {
  const c = C[entry.id];
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-subtle/40 text-xs hover:bg-elevated/50 transition-colors">
      <span className="text-tertiary w-16 shrink-0 font-mono">{entry.timestamp}</span>
      <span className={`w-16 shrink-0 font-mono ${c.text}`}>{entry.id}</span>
      {entry.success
        ? <span className="text-emerald-400">✓ 200 OK</span>
        : <span className="text-red-400">✗ {entry.httpStatus}</span>}
      <span className="ml-auto text-tertiary font-mono">{entry.ms >= 5000 ? ">5000ms" : `${entry.ms}ms`}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Scenario5LoadBalancing({ sockets }) {
  const [servers, setServers]         = useState(META.map(initServer));
  const [healthLog, setHealthLog]     = useState([]);
  const [isRunning, setIsRunning]     = useState(false);
  const [activeServer, setActiveServer] = useState(null);
  const [requestsSent, setRequestsSent] = useState(0);
  const [totalToSend] = useState(50);

  const serversRef = useRef(servers);
  useEffect(() => { serversRef.current = servers; }, [servers]);
  const rrIndex = useRef(0);

  const runHealthChecks = useCallback(async () => {
    const results = await Promise.all(
      META.map(async (m) => {
        const start = Date.now();
        try {
          const r = await fetch(`${SERVER_URLS[m.urlIdx]}/scenarios/load-balancing/health`, { signal: AbortSignal.timeout(5000) });
          return { id: m.id, success: r.ok, ms: Date.now() - start, httpStatus: r.status };
        } catch {
          return { id: m.id, success: false, ms: Date.now() - start, httpStatus: "timeout" };
        }
      })
    );
    setServers((prev) => prev.map((s, i) => ({
      ...s, status: results[i].success ? "healthy" : "down",
      lastHealthMs: results[i].ms >= 5000 ? null : results[i].ms,
      lastHealthOk: results[i].success,
    })));
    setHealthLog((prev) => [...results.map((r) => ({ ...r, timestamp: new Date().toLocaleTimeString() })), ...prev].slice(0, 18));
  }, []);

  useEffect(() => { runHealthChecks(); const id = setInterval(runHealthChecks, 3000); return () => clearInterval(id); }, [runHealthChecks]);

  useEffect(() => {
    if (!sockets?.length) return;
    const teardowns = sockets.flatMap((socket) => {
      const onProcessed = (d) => setServers((prev) => prev.map((s) => s.id !== d.serverId ? s : { ...s, requestCount: d.requestCount, responseTimes: [...s.responseTimes, d.responseTime].slice(-20) }));
      const onKilled    = (d) => setServers((prev) => prev.map((s) => s.id === d.serverId ? { ...s, status: "down"    } : s));
      const onRestarted = (d) => setServers((prev) => prev.map((s) => s.id === d.serverId ? { ...s, status: "healthy" } : s));
      const onReset     = (d) => setServers((prev) => prev.map((s) => s.id === d.serverId ? { ...s, requestCount: 0, responseTimes: [], status: "healthy" } : s));
      socket.on("scenario5:request_processed", onProcessed);
      socket.on("scenario5:server_killed",     onKilled);
      socket.on("scenario5:server_restarted",  onRestarted);
      socket.on("scenario5:reset",             onReset);
      return [
        () => socket.off("scenario5:request_processed", onProcessed),
        () => socket.off("scenario5:server_killed",     onKilled),
        () => socket.off("scenario5:server_restarted",  onRestarted),
        () => socket.off("scenario5:reset",             onReset),
      ];
    });
    return () => teardowns.forEach((fn) => fn());
  }, [sockets]);

  const sendRequests = async () => {
    if (isRunning) return;
    setIsRunning(true); setRequestsSent(0); rrIndex.current = 0;
    for (let i = 0; i < totalToSend; i++) {
      const healthy = serversRef.current.filter((s) => s.status === "healthy");
      if (healthy.length === 0) break;
      const target = healthy[rrIndex.current % healthy.length];
      rrIndex.current++;
      setActiveServer(target.id);
      await fetch(`${SERVER_URLS[target.urlIdx]}/scenarios/load-balancing/process-request`, { method: "POST", signal: AbortSignal.timeout(5000) }).catch(() => null);
      setRequestsSent((n) => n + 1);
      await sleep(100);
    }
    setActiveServer(null); setIsRunning(false);
  };

  const killServer = async (id) => {
    const m = META.find((x) => x.id === id);
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, status: "down" } : s));
    await fetch(`${SERVER_URLS[m.urlIdx]}/scenarios/load-balancing/kill`, { method: "POST" }).catch(() => null);
  };

  const restartServer = async (id) => {
    const m = META.find((x) => x.id === id);
    setServers((prev) => prev.map((s) => s.id === id ? { ...s, status: "healthy" } : s));
    await fetch(`${SERVER_URLS[m.urlIdx]}/scenarios/load-balancing/restart`, { method: "POST" }).catch(() => null);
  };

  const resetAll = async () => {
    if (isRunning) return;
    await Promise.all(META.map((m) => fetch(`${SERVER_URLS[m.urlIdx]}/scenarios/load-balancing/reset`, { method: "POST" }).catch(() => null)));
    setServers(META.map(initServer)); setRequestsSent(0); setHealthLog([]); setActiveServer(null); rrIndex.current = 0;
    runHealthChecks();
  };

  const totalRequests = servers.reduce((s, sv) => s + sv.requestCount, 0);
  const healthyCount  = servers.filter((s) => s.status === "healthy").length;

  return (
    <div className="space-y-4">

      {/* ── Load Balancer box ──────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-card bg-elevated border border-subtle flex items-center justify-center text-lg">⚖️</div>
            <div>
              <div className="text-sm font-semibold text-primary">Load Balancer</div>
              <div className="text-xs text-tertiary">Client-side · Round Robin</div>
            </div>
          </div>
          <div className="flex items-center gap-8 text-xs">
            <div className="text-center">
              <div className={`text-xl font-mono font-bold ${healthyCount > 0 ? "text-emerald-400" : "text-red-400"}`}>{healthyCount}/3</div>
              <div className="text-tertiary">healthy</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-primary">{totalRequests}</div>
              <div className="text-tertiary">total routed</div>
            </div>
            <div className="text-center min-w-[80px]">
              {activeServer ? (
                <>
                  <div className={`text-sm font-mono font-bold ${C[activeServer].text}`}>→ {activeServer}</div>
                  <div className="text-tertiary">routing now</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-mono font-bold text-tertiary">idle</div>
                  <div className="text-tertiary">status</div>
                </>
              )}
            </div>
          </div>
        </div>

        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-secondary mb-1.5">
              <span>Routing requests…</span>
              <span className="font-mono">{requestsSent}/{totalToSend}</span>
            </div>
            <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${(requestsSent / totalToSend) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Connectors ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 -mb-2">
        {servers.map((s) => (
          <div key={s.id} className="flex justify-center">
            <ConnectorColumn serverId={s.id} isActive={activeServer === s.id} isHealthy={s.status === "healthy"} />
          </div>
        ))}
      </div>

      {/* ── Server cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {servers.map((s) => (
          <ServerCard key={s.id} server={s} isActive={activeServer === s.id} onKill={() => killServer(s.id)} onRestart={() => restartServer(s.id)} />
        ))}
      </div>

      {/* ── Traffic distribution ──────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-4 space-y-2.5">
        <div className="section-label mb-3">Traffic Distribution</div>
        {servers.map((s) => <TrafficBar key={s.id} server={s} total={totalRequests} />)}
        {totalRequests === 0 && <p className="text-center text-tertiary text-xs py-2">No traffic yet</p>}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={sendRequests}
          disabled={isRunning || healthyCount === 0}
          className={`px-5 py-2 rounded-button text-sm font-medium transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            isRunning || healthyCount === 0 ? "bg-elevated text-tertiary" : "bg-emerald-700 hover:bg-emerald-600 text-white"
          }`}
        >
          {isRunning ? `⏳ Routing ${requestsSent}/${totalToSend}…` : healthyCount === 0 ? "No healthy servers" : `⚖️ Send ${totalToSend} Requests`}
        </button>
        <button onClick={resetAll} disabled={isRunning} className="btn-secondary px-4 py-2">Reset All</button>
        <span className="text-xs text-tertiary">Health checks every 3s · 5s timeout</span>
      </div>

      {/* ── Health log + explanation ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-subtle bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-subtle">
            <span className="section-label">Health Check Log</span>
          </div>
          <div className="h-48 overflow-y-auto">
            {healthLog.length === 0
              ? <p className="text-center text-tertiary text-xs py-8">Awaiting first check…</p>
              : healthLog.map((e, i) => <HealthLogRow key={i} entry={e} />)}
          </div>
        </div>

        <div className="rounded-card border border-subtle bg-card/50 p-4 text-xs space-y-3">
          <p className="text-primary font-medium text-sm">How it works</p>
          <p className="text-secondary leading-relaxed">
            <span className="text-emerald-400 font-medium">Health checks:</span> The browser polls{" "}
            <span className="font-mono text-secondary">/load-balancing/health</span> on each server every 3s
            with a 5s timeout. A killed server stalls 10s, so the timeout fires first.
          </p>
          <p className="text-secondary leading-relaxed">
            <span className="text-emerald-400 font-medium">Failover:</span> Round-robin only includes healthy servers.
            Kill one mid-run — traffic instantly reroutes to the remaining two with no requests dropped.
          </p>
          <p className="text-secondary leading-relaxed">
            <span className="text-emerald-400 font-medium">Recovery:</span> Restart a server and it
            rejoins the healthy pool on the next health check cycle (≤3s).
          </p>
        </div>
      </div>

      {/* ── Server Stats (in-memory, no DB) ───────────────────────────────── */}
      <ServerStatsPanel serverUrls={SERVER_URLS} />
    </div>
  );
}

function ServerStatsPanel({ serverUrls }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const results = await Promise.allSettled(
        serverUrls.map((url) =>
          fetch(`${url}/scenarios/load-balancing/stats`, { signal: AbortSignal.timeout(2000) })
            .then((r) => r.ok ? r.json() : null).catch(() => null)
        )
      );
      if (!mounted) return;
      setRows(
        results.map((r, i) => {
          const d = r.status === "fulfilled" ? r.value : null;
          return {
            server:   `server-${i + 1}`,
            status:   d ? (d.isAlive ? "alive" : "killed") : "unreachable",
            requests: d?.requestCount ?? "—",
            uptime:   d ? `${d.uptime}s` : "—",
          };
        })
      );
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
  }, [serverUrls]);

  return (
    <div className="rounded-card border border-subtle bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-gray text-2xs text-tertiary">In-memory</span>
          <span className="font-mono text-xs text-secondary">server stats</span>
        </div>
        <span className="text-tertiary text-2xs">Load balancing uses no persistent storage</span>
      </div>
      <div className="overflow-x-auto">
        <DbTable
          columns={["server", "status", "requests", "uptime"]}
          rows={rows}
          formatters={{
            server: (v) => <span className="text-secondary">{v}</span>,
            status: (v) => (
              <span className={v === "alive" ? "text-emerald-400" : v === "killed" ? "text-red-400" : "text-tertiary"}>
                {v}
              </span>
            ),
            requests: (v) => <span className="text-primary">{v}</span>,
          }}
        />
      </div>
    </div>
  );
}

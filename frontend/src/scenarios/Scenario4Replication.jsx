import { useState, useEffect, useRef, useCallback } from "react";
import DbPanel, { DbTable } from "../components/DbPanel.jsx";
import { SERVER_URLS } from "../utils/serverUrls.js";

const BASE = (i) => `${SERVER_URLS[i]}/scenarios/replication`;

const INITIAL_VALUE = "initial_value";

const INIT_NODES = [
  { id: "server-1", port: 3001, isPrimary: true,  value: INITIAL_VALUE, syncProgress: 100, isSyncing: false, lastSyncTime: null },
  { id: "server-2", port: 3002, isPrimary: false, value: INITIAL_VALUE, syncProgress: 100, isSyncing: false, lastSyncTime: null },
  { id: "server-3", port: 3003, isPrimary: false, value: INITIAL_VALUE, syncProgress: 100, isSyncing: false, lastSyncTime: null },
];

function ValueTag({ value, isPrimary, syncProgress, isSyncing }) {
  const stale = !isPrimary && (isSyncing || syncProgress < 100);
  return (
    <div className={`font-mono text-sm px-2 py-0.5 rounded-button inline-block max-w-full truncate ${
      isPrimary ? "bg-blue-500/20 text-blue-300" :
      stale     ? "bg-amber-500/20 text-amber-300" :
                  "bg-emerald-500/20 text-emerald-300"
    }`}>
      "{value}"
    </div>
  );
}

function PrimaryNode({ node, isWriting }) {
  return (
    <div className={`rounded-card border-2 p-4 transition-all duration-300 ${
      isWriting ? "border-blue-400 bg-blue-500/10" : "border-blue-500/30 bg-blue-500/5"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-sm">PRIMARY</span>
          <span className="text-tertiary text-xs font-mono">{node.id} :{node.port}</span>
        </div>
        <span className="badge badge-blue">Read / Write</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">DB value</span>
          <ValueTag value={node.value} isPrimary={true} />
        </div>
        <div className="text-xs text-emerald-400">✓ Always consistent — source of truth</div>
      </div>
    </div>
  );
}

function ReplicaNode({ node, isTarget }) {
  const C = node.id === "server-2"
    ? { text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/5", activeBorder: "border-amber-400", activeBg: "bg-amber-500/5", bar: "bg-purple-500" }
    : { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5", activeBorder: "border-amber-400", activeBg: "bg-amber-500/5", bar: "bg-emerald-500" };

  const stale = node.isSyncing || node.syncProgress < 100;

  return (
    <div className={`rounded-card border-2 p-4 transition-all duration-300 ${
      stale ? `${C.activeBorder} ${C.activeBg}` : `${C.border} ${C.bg}`
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${C.text}`}>REPLICA</span>
          <span className="text-tertiary text-xs font-mono">{node.id} :{node.port}</span>
        </div>
        {stale ? (
          <span className="badge badge-amber animate-pulse">Syncing…</span>
        ) : (
          <span className="badge badge-green">Synced</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">Replica value</span>
          <ValueTag value={node.value} isPrimary={false} syncProgress={node.syncProgress} isSyncing={node.isSyncing} />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-tertiary">Sync progress</span>
            <span className={`font-mono ${stale ? "text-amber-400" : "text-emerald-400"}`}>{node.syncProgress}%</span>
          </div>
          <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${stale ? "bg-amber-400" : C.bar}`}
              style={{ width: `${node.syncProgress}%` }}
            />
          </div>
        </div>

        {node.lastSyncTime && !stale && (
          <div className="text-xs text-tertiary">
            Last sync: {new Date(node.lastSyncTime).toLocaleTimeString()}
          </div>
        )}
      </div>

      {stale && isTarget && (
        <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 rounded-button px-2 py-1">
          ⚠ Serving stale data — replica lags behind primary
        </div>
      )}
    </div>
  );
}

function ReadResult({ result, primaryValue }) {
  if (!result) return null;
  const isStale = result.source === "replica" && result.value !== primaryValue;
  return (
    <div className={`rounded-button px-3 py-2 text-xs border animate-fade-in ${
      isStale
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-emerald-500/30 bg-emerald-500/5"
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className={result.source === "primary" ? "text-blue-400" : "text-secondary"}>
            {result.source === "primary" ? "🔵 Primary" : "🟡 Replica"}
          </span>
          <span className="text-tertiary ml-1 font-mono">({result.serverId})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-primary">"{result.value}"</span>
          {isStale ? (
            <span className="text-amber-400">❌ stale ({result.syncProgress}% synced)</span>
          ) : (
            <span className="text-emerald-400">✓ consistent</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ entry }) {
  const C = {
    write:    "text-blue-400",
    start:    "text-amber-400",
    progress: "text-tertiary",
    complete: "text-emerald-400",
    reset:    "text-tertiary",
  }[entry.type] || "text-secondary";

  return (
    <div className={`flex items-start gap-2 text-xs ${C}`}>
      <span className="timeline-time shrink-0 w-12">+{entry.elapsed}s</span>
      <span>{entry.icon}</span>
      <span className="leading-tight">{entry.text}</span>
    </div>
  );
}

export default function Scenario4Replication({ sockets }) {
  const [nodes, setNodes]             = useState(INIT_NODES);
  const [writeValue, setWriteValue]   = useState("hello_world");
  const [delayMs, setDelayMs]         = useState(3000);
  const [isWriting, setIsWriting]     = useState(false);
  const [readResults, setReadResults] = useState([]);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [timeline, setTimeline]       = useState([]);
  const writeStartRef                 = useRef(null);
  const nodesRef                      = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const fetchAllStatus = useCallback(async () => {
    const results = await Promise.allSettled(
      [0, 1, 2].map((i) =>
        fetch(`${BASE(i)}/status`).then((r) => r.ok ? r.json() : null).catch(() => null)
      )
    );
    setNodes((prev) =>
      prev.map((n, i) => {
        const data = results[i].status === "fulfilled" ? results[i].value : null;
        if (!data) return n;
        return { ...n, value: data.value ?? n.value, syncProgress: data.syncProgress ?? n.syncProgress, isSyncing: data.isSyncing ?? n.isSyncing, lastSyncTime: data.lastSyncTime ?? n.lastSyncTime };
      })
    );
  }, []);

  useEffect(() => { fetchAllStatus(); }, [fetchAllStatus]);

  const addEvent = useCallback((type, icon, text) => {
    const elapsed = writeStartRef.current
      ? ((Date.now() - writeStartRef.current) / 1000).toFixed(1)
      : "0.0";
    setTimeline((prev) => [...prev, { type, icon, text, elapsed, id: Date.now() + Math.random() }].slice(-30));
  }, []);

  useEffect(() => {
    if (!sockets?.length) return;
    const teardowns = sockets.flatMap((socket) => {
      const onPrimaryWrite = (d) => {
        setNodes((prev) => prev.map((n) => n.isPrimary ? { ...n, value: d.value } : n));
        if (d.replicationDelay > 0)
          addEvent("write", "✍️", `Primary wrote "${d.value}" (replication delay: ${d.replicationDelay / 1000}s)`);
      };
      const onStarted  = (d) => {
        setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, isSyncing: true, syncProgress: 0 } : n));
        addEvent("start", "🔄", `Replication started → ${d.serverId} (target: "${d.targetValue}")`);
      };
      const onProgress = (d) => {
        setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, syncProgress: d.progress } : n));
        if (d.progress % 30 === 0) addEvent("progress", "📊", `${d.serverId}: ${d.progress}% synced`);
      };
      const onComplete = (d) => {
        setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, value: d.value, syncProgress: 100, isSyncing: false, lastSyncTime: new Date().toISOString() } : n));
        addEvent("complete", "✅", `${d.serverId} fully synced — value is now "${d.value}"`);
      };
      const onReset = (d) => {
        setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, value: INITIAL_VALUE, syncProgress: 100, isSyncing: false } : n));
      };

      socket.on("scenario4:primary_write",       onPrimaryWrite);
      socket.on("scenario4:replication_started",  onStarted);
      socket.on("scenario4:replication_progress", onProgress);
      socket.on("scenario4:replication_complete", onComplete);
      socket.on("scenario4:reset",                onReset);
      return [
        () => socket.off("scenario4:primary_write",       onPrimaryWrite),
        () => socket.off("scenario4:replication_started",  onStarted),
        () => socket.off("scenario4:replication_progress", onProgress),
        () => socket.off("scenario4:replication_complete", onComplete),
        () => socket.off("scenario4:reset",                onReset),
      ];
    });
    return () => teardowns.forEach((fn) => fn());
  }, [sockets, addEvent]);

  const writeToPrimary = async () => {
    if (isWriting || !writeValue.trim()) return;
    setIsWriting(true);
    setReadResults([]);
    setTimeline([]);
    writeStartRef.current = Date.now();
    setNodes((prev) => prev.map((n) => n.isPrimary ? n : { ...n, isSyncing: true, syncProgress: 0 }));
    try {
      await fetch(`${BASE(0)}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: writeValue.trim(), replicationDelay: delayMs }),
      });
    } catch {/* ignore */}
    setIsWriting(false);
  };

  const readAll = async () => {
    setIsReadingAll(true);
    const results = await Promise.allSettled(
      [0, 1, 2].map((i) =>
        fetch(`${BASE(i)}/read`).then((r) => r.ok ? r.json() : null).catch(() => null)
      )
    );
    setReadResults(results.map((r, i) => r.status === "fulfilled" && r.value ? { ...r.value, urlIdx: i } : null).filter(Boolean));
    setIsReadingAll(false);
  };

  const reset = async () => {
    await fetch(`${BASE(0)}/reset`, { method: "POST" }).catch(() => null);
    setReadResults([]);
    setTimeline([]);
    writeStartRef.current = null;
    await fetchAllStatus();
  };

  const primaryNode  = nodes[0];
  const replicaNodes = nodes.slice(1);
  const anyStale     = readResults.some((r) => r.source === "replica" && r.value !== primaryNode.value);

  return (
    <div className="space-y-4">

      {/* ── Replication topology ───────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="section-label mb-4">Replication Topology — async fan-out</div>

        <div className="flex justify-center mb-0">
          <div className="w-96">
            <PrimaryNode node={primaryNode} isWriting={isWriting} />
          </div>
        </div>

        {/* Connector lines */}
        <div className="flex justify-center gap-32 h-10 relative">
          {[nodes[1], nodes[2]].map((n, i) => (
            <div key={n.id} className="flex flex-col items-center relative">
              <div className={`w-px h-full transition-colors ${n.isSyncing ? "bg-amber-400" : "bg-subtle"}`} />
              {n.isSyncing && (
                <div className={`absolute top-0 w-2.5 h-2.5 rounded-full animate-travel ${
                  i === 0 ? "bg-purple-500" : "bg-emerald-500"
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {replicaNodes.map((n) => (
            <ReplicaNode
              key={n.id}
              node={n}
              isTarget={readResults.some((r) => r.serverId === n.id && r.value !== primaryNode.value)}
            />
          ))}
        </div>
      </div>

      {/* ── Write controls ────────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-4 space-y-4">
        <div className="section-label">Write to Primary</div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-elevated border border-subtle rounded-button px-3 py-1.5">
            <span className="text-tertiary text-xs">value</span>
            <input
              type="text"
              value={writeValue}
              onChange={(e) => setWriteValue(e.target.value)}
              className="bg-transparent text-sm text-primary outline-none font-mono w-36"
              placeholder="hello_world"
            />
          </div>

          <button
            onClick={writeToPrimary}
            disabled={isWriting || !writeValue.trim()}
            className="btn-primary px-5 py-2"
          >
            {isWriting ? "⏳ Writing…" : "✍️ Write to Primary"}
          </button>

          <button
            onClick={readAll}
            disabled={isReadingAll}
            className="btn-secondary px-4 py-2"
          >
            {isReadingAll ? "Reading…" : "📖 Read from All Servers"}
          </button>

          <button onClick={reset} className="btn-secondary px-4 py-2">Reset</button>
        </div>

        {/* Replication delay slider */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-secondary shrink-0">Replication delay</span>
          <input
            type="range"
            min={500}
            max={8000}
            step={500}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="text-xs font-mono text-amber-400 w-10 text-right">{delayMs / 1000}s</span>
        </div>
      </div>

      {/* ── Read results ──────────────────────────────────────────────────── */}
      {readResults.length > 0 && (
        <div className={`rounded-card border-2 p-4 space-y-3 animate-fade-in ${
          anyStale ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
        }`}>
          <div>
            {anyStale ? (
              <div className="text-amber-400 font-medium text-sm">⚠ Read-Your-Own-Writes Violation</div>
            ) : (
              <div className="text-emerald-400 font-medium text-sm">✓ All nodes consistent</div>
            )}
            <div className="text-xs text-secondary mt-0.5">
              {anyStale
                ? "Replicas are serving stale data — this is Eventual Consistency in action"
                : "Replication has caught up — all nodes agree on the same value"}
            </div>
          </div>

          <div className="space-y-1.5">
            {readResults.map((r, i) => (
              <ReadResult key={i} result={r} primaryValue={primaryNode.value} />
            ))}
          </div>

          {anyStale && (
            <div className="text-xs text-tertiary text-center">
              Retry "Read from All Servers" in a few seconds to see replicas catch up
            </div>
          )}
        </div>
      )}

      {/* ── Timeline + CAP explanation ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-subtle bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-subtle">
            <span className="section-label">Replication Timeline</span>
          </div>
          <div className="p-3 space-y-1.5 h-52 overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-center text-tertiary text-xs py-8">
                Write to primary to see replication events
              </p>
            ) : (
              timeline.map((e) => <TimelineEntry key={e.id} entry={e} />)
            )}
          </div>
        </div>

        <div className="rounded-card border border-subtle bg-card/50 p-4 text-xs space-y-3">
          <p className="text-primary font-medium text-sm">Eventual Consistency (AP System)</p>

          <div className="space-y-2 text-secondary leading-relaxed">
            <p>
              <span className="text-blue-400 font-medium">Primary</span> always has the latest value — all
              writes go here. This is the <em>source of truth</em>.
            </p>
            <p>
              <span className="text-amber-400 font-medium">Replicas</span> receive updates
              asynchronously via Redis pub/sub. During the replication window, they serve{" "}
              <em>stale data</em> to readers.
            </p>
            <p>
              <span className="text-emerald-400 font-medium">Eventual:</span> given no new writes,
              all replicas will converge to the primary's value. The slider controls how long
              that window is.
            </p>
          </div>

          <div className="rounded-button bg-deep border border-subtle p-2 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { letter: "C", label: "Consistency",   ok: false },
              { letter: "A", label: "Availability",  ok: true  },
              { letter: "P", label: "Partition tol.", ok: true  },
            ].map(({ letter, label, ok }) => (
              <div key={letter}>
                <div className={`font-bold ${ok ? "text-emerald-400" : "text-red-400"}`}>{letter}</div>
                <div className="text-tertiary">{label}</div>
                <div className={`text-lg ${ok ? "text-emerald-400" : "text-red-500"}`}>{ok ? "✓" : "✗"}</div>
              </div>
            ))}
          </div>
          <p className="text-tertiary text-center">
            AP system — like <span className="text-secondary">DynamoDB</span>, <span className="text-secondary">Cassandra</span>, <span className="text-secondary">Couchbase</span>
          </p>
        </div>
      </div>

      {/* ── DB State ──────────────────────────────────────────────────────── */}
      <DbPanel
        title="primary_data"
        endpoint={`${SERVER_URLS[0]}/scenarios/replication/db-state`}
        pollMs={1000}
      >
        {(data) => (
          <DbTable
            columns={["id", "value", "updated_at"]}
            rows={data?.rows}
            formatters={{
              value:      (v) => <span className="text-primary font-bold">"{v}"</span>,
              updated_at: (v) => v ? new Date(v).toLocaleTimeString() : "—",
            }}
          />
        )}
      </DbPanel>
    </div>
  );
}

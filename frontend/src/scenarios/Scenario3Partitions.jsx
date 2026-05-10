import { useState, useEffect, useRef, useCallback } from "react";
import DbPanel, { DbTable } from "../components/DbPanel.jsx";
import { SERVER_URLS } from "../utils/serverUrls.js";
const BASE = (i) => `${SERVER_URLS[i]}/scenarios/partitions`;

const INIT_NODES = [
  { id: "server-1", num: 1, port: 3001, isLeader: false, isPartitioned: false, term: 0, clusterValue: "initial", redisTerm: 0 },
  { id: "server-2", num: 2, port: 3002, isLeader: false, isPartitioned: false, term: 0, clusterValue: "initial", redisTerm: 0 },
  { id: "server-3", num: 3, port: 3003, isLeader: false, isPartitioned: false, term: 0, clusterValue: "initial", redisTerm: 0 },
];

function nodeColors(node) {
  if (node.isPartitioned) return { border: "border-red-500/60",    bg: "bg-red-500/5",    text: "text-red-400"    };
  if (node.isLeader)      return { border: "border-yellow-400/70", bg: "bg-yellow-500/5", text: "text-yellow-400" };
  return                         { border: "border-subtle",        bg: "bg-card",         text: "text-secondary"  };
}

function roleLabel(node) {
  if (node.isPartitioned && node.isLeader) return "ISOLATED LEADER";
  if (node.isPartitioned)                  return "ISOLATED";
  if (node.isLeader)                       return "LEADER";
  return "FOLLOWER";
}

// ── ServerNode ────────────────────────────────────────────────────────────────
function ServerNode({ node, onPartition, onWrite, writeValue, onHeal, isResetting }) {
  const C = nodeColors(node);
  const isSplitBrainLeader = node.isPartitioned && node.isLeader;

  return (
    <div className={`rounded-card border-2 p-4 transition-all w-44 ${C.border} ${C.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {node.isLeader && (
            <span className={`text-lg ${isSplitBrainLeader ? "animate-pulse" : "animate-crown-in"}`}>👑</span>
          )}
          <div>
            <div className={`text-xs font-bold ${C.text}`}>{roleLabel(node)}</div>
            <div className="text-tertiary text-xs font-mono">{node.id}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-tertiary">term</div>
          <div className={`text-sm font-mono font-bold ${C.text}`}>{node.term}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-tertiary mb-0.5">value</div>
        <div className={`font-mono text-xs px-1.5 py-0.5 rounded-button truncate ${
          node.isLeader && node.isPartitioned ? "bg-red-500/20 text-red-300" : "bg-elevated text-secondary"
        }`}>
          "{node.clusterValue}"
        </div>
      </div>

      <div className="space-y-1.5">
        {!node.isPartitioned ? (
          <button onClick={() => onPartition(node.num - 1)} disabled={isResetting}
            className="w-full text-xs py-1 rounded-button border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
            Isolate
          </button>
        ) : (
          <button onClick={() => onHeal(node.num - 1)} disabled={isResetting}
            className="w-full text-xs py-1 rounded-button border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
            Heal
          </button>
        )}
        <button onClick={() => onWrite(node.num - 1)} disabled={isResetting || !writeValue.trim()}
          className={`w-full text-xs py-1 rounded-button transition-colors disabled:opacity-40 ${
            node.isLeader
              ? "border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
              : "border border-subtle text-tertiary hover:text-secondary"
          }`}>
          Write here
        </button>
      </div>

      {isSplitBrainLeader && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-button px-1.5 py-1 text-center animate-pulse">
          ⚠ Split brain
        </div>
      )}
    </div>
  );
}

// ── ConnectionLine ────────────────────────────────────────────────────────────
function ConnectionLine({ nodeA, nodeB, heartbeatActive }) {
  const broken = nodeA.isPartitioned || nodeB.isPartitioned;
  return (
    <div className="flex items-center justify-center flex-1 relative h-full">
      {broken ? (
        <div className="flex items-center gap-0.5 w-full">
          <div className="flex-1 h-px border-t border-dashed border-red-500/60" />
          <span className="text-red-500 text-sm font-bold px-1">✗</span>
          <div className="flex-1 h-px border-t border-dashed border-red-500/60" />
        </div>
      ) : (
        <div className="relative w-full flex items-center">
          <div className={`w-full h-px transition-colors duration-200 ${heartbeatActive ? "bg-yellow-400" : "bg-prominent"}`} />
          {heartbeatActive && <div className="absolute left-0 w-3 h-3 rounded-full bg-yellow-400 opacity-60 animate-ping" />}
        </div>
      )}
    </div>
  );
}

// ── SplitBrainPanel ───────────────────────────────────────────────────────────
function SplitBrainPanel({ leaders }) {
  if (leaders.length < 2) return null;
  const values  = [...new Set(leaders.map((n) => n.clusterValue))];
  const hasConflict = values.length > 1;
  const winner  = leaders.reduce((a, b) => (a.term >= b.term ? a : b));

  return (
    <div className="rounded-card border-2 border-red-500/50 bg-red-500/5 p-4 space-y-3 animate-slide-down">
      <div className="flex items-center gap-2">
        <span className="text-lg animate-pulse">⚠️</span>
        <div>
          <div className="text-red-400 font-bold text-sm">SPLIT BRAIN DETECTED</div>
          <div className="text-xs text-secondary">Multiple servers believe they are the leader</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {leaders.map((n) => (
          <div key={n.id} className="rounded-card bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs space-y-1">
            <div className="text-red-300 font-medium">👑 {n.id}</div>
            <div className="text-secondary">Term: <span className="text-primary font-mono">{n.term}</span></div>
            <div className="text-secondary">Value: <span className="font-mono text-amber-300">"{n.clusterValue}"</span></div>
            {n.isPartitioned && <div className="text-red-500">⚡ isolated</div>}
          </div>
        ))}
      </div>

      {hasConflict && (
        <div className="rounded-card bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs space-y-1">
          <div className="text-amber-400 font-medium">DATA CONFLICT — divergent values</div>
          {values.map((v) => <div key={v} className="font-mono text-secondary">• "{v}"</div>)}
        </div>
      )}

      <div className="rounded-card bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs">
        <div className="text-emerald-400 font-medium mb-1">Resolution: higher term wins</div>
        <div className="text-secondary">
          <span className="text-primary">{winner.id}</span> (term {winner.term}) will be canonical after partition heals.
          {hasConflict && <span className="text-red-400"> Writes to the lower-term leader will be lost.</span>}
        </div>
      </div>
    </div>
  );
}

// ── ReadResultRow ─────────────────────────────────────────────────────────────
function ReadResultRow({ result }) {
  return (
    <div className={`rounded-button px-3 py-2 text-xs border flex items-center justify-between gap-2 ${
      result.isLeader ? "border-yellow-500/30 bg-yellow-500/5" : "border-subtle bg-card"
    }`}>
      <div className="flex items-center gap-2">
        {result.isLeader && <span>👑</span>}
        <span className="text-secondary font-mono">{result.readFrom}</span>
        {result.isPartitioned && <span className="text-red-400">(isolated)</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-primary">"{result.value}"</span>
        <span className="text-tertiary">term {result.term}</span>
      </div>
    </div>
  );
}

// ── TimelineEntry ─────────────────────────────────────────────────────────────
function TimelineEntry({ entry }) {
  const colorMap = {
    election: "text-blue-400", leader: "text-yellow-400", partition: "text-red-400",
    heal: "text-emerald-400",  vote: "text-purple-400",   write: "text-cyan-400",
    stepdown: "text-amber-400", reset: "text-tertiary",
  };
  return (
    <div className={`flex items-start gap-2 text-xs ${colorMap[entry.type] ?? "text-secondary"}`}>
      <span className="timeline-time">+{entry.elapsed}s</span>
      <span>{entry.icon}</span>
      <span className="leading-tight">{entry.text}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Scenario3Partitions({ sockets }) {
  const [nodes, setNodes]               = useState(INIT_NODES);
  const [writeValue, setWriteValue]     = useState("leader_data");
  const [readResults, setReadResults]   = useState([]);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [timeline, setTimeline]         = useState([]);
  const [heartbeatServerId, setHeartbeatServerId] = useState(null);
  const [isResetting, setIsResetting]   = useState(false);

  const startRef = useRef(null);
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const addEvent = useCallback((type, icon, text) => {
    if (!startRef.current) startRef.current = Date.now();
    const elapsed = ((Date.now() - startRef.current) / 1000).toFixed(1);
    setTimeline((prev) => [...prev, { type, icon, text, elapsed, id: Date.now() + Math.random() }].slice(-40));
  }, []);

  const fetchAllStatus = useCallback(async () => {
    const results = await Promise.allSettled(
      [0, 1, 2].map((i) => fetch(`${BASE(i)}/status`).then((r) => r.ok ? r.json() : null).catch(() => null))
    );
    setNodes((prev) => prev.map((n, i) => {
      const d = results[i].status === "fulfilled" ? results[i].value : null;
      if (!d) return n;
      return { ...n, isLeader: d.isLeader ?? n.isLeader, isPartitioned: d.isPartitioned ?? n.isPartitioned, term: d.term ?? n.term, clusterValue: d.clusterValue ?? n.clusterValue, redisTerm: d.redisTerm ?? n.redisTerm };
    }));
  }, []);

  useEffect(() => { fetchAllStatus(); const id = setInterval(fetchAllStatus, 2000); return () => clearInterval(id); }, [fetchAllStatus]);

  useEffect(() => {
    if (!sockets?.length) return;
    const teardowns = sockets.flatMap((socket) => {
      const onElection   = (d) => addEvent("election",  "🗳️",  `${d.candidateId} started election (term ${d.term})`);
      const onLeader     = (d) => { setNodes((prev) => prev.map((n) => ({ ...n, isLeader: n.id === d.leaderId, term: n.id === d.leaderId ? d.term : Math.max(n.term, d.term) }))); addEvent("leader", "👑", `${d.leaderId} elected leader — term ${d.term}`); };
      const onPartitioned= (d) => { setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, isPartitioned: true } : n)); addEvent("partition", "⚡", `${d.serverId} isolated${d.wasLeader ? " (was leader — split brain risk!)" : ""}`); };
      const onHealed     = (d) => { setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, isPartitioned: false } : n)); addEvent("heal", "🔗", `${d.serverId} rejoined cluster (term ${d.term})`); };
      const onStepDown   = (d) => { setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, isLeader: false, term: d.newTerm } : n)); addEvent("stepdown", "⬇️", `${d.serverId} stepped down — saw higher term ${d.newTerm}`); };
      const onVote       = (d) => addEvent("vote",  "✅", `${d.voterId} voted for ${d.candidateId} (term ${d.term})`);
      const onWrite      = (d) => { setNodes((prev) => prev.map((n) => n.id === d.serverId ? { ...n, clusterValue: d.value } : n)); addEvent("write", "✍️", `${d.serverId} wrote "${d.value}" (term ${d.term}${d.isPartitioned ? ", ISOLATED" : ""})`); };
      const onHeartbeat  = (d) => { setHeartbeatServerId(d.leaderId); setTimeout(() => setHeartbeatServerId(null), 400); };
      const onReset      = () => { setNodes(INIT_NODES); setReadResults([]); setTimeline([]); startRef.current = null; };

      socket.on("scenario3:election_started",   onElection);
      socket.on("scenario3:leader_elected",      onLeader);
      socket.on("scenario3:server_partitioned",  onPartitioned);
      socket.on("scenario3:server_healed",       onHealed);
      socket.on("scenario3:leader_stepped_down", onStepDown);
      socket.on("scenario3:vote_cast",           onVote);
      socket.on("scenario3:value_written",       onWrite);
      socket.on("scenario3:heartbeat",           onHeartbeat);
      socket.on("scenario3:reset",               onReset);

      return [
        () => socket.off("scenario3:election_started",   onElection),
        () => socket.off("scenario3:leader_elected",      onLeader),
        () => socket.off("scenario3:server_partitioned",  onPartitioned),
        () => socket.off("scenario3:server_healed",       onHealed),
        () => socket.off("scenario3:leader_stepped_down", onStepDown),
        () => socket.off("scenario3:vote_cast",           onVote),
        () => socket.off("scenario3:value_written",       onWrite),
        () => socket.off("scenario3:heartbeat",           onHeartbeat),
        () => socket.off("scenario3:reset",               onReset),
      ];
    });
    return () => teardowns.forEach((fn) => fn());
  }, [sockets, addEvent]);

  const handlePartition = async (idx) => {
    if (!startRef.current) startRef.current = Date.now();
    await fetch(`${BASE(idx)}/partition`, { method: "POST" }).catch(() => null);
    fetchAllStatus();
  };
  const handleHeal = async (idx) => { await fetch(`${BASE(idx)}/heal`, { method: "POST" }).catch(() => null); fetchAllStatus(); };
  const handleWrite = async (idx) => {
    if (!writeValue.trim()) return;
    if (!startRef.current) startRef.current = Date.now();
    const r = await fetch(`${BASE(idx)}/write`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: writeValue.trim() }) }).catch(() => null);
    if (r && !r.ok) { const d = await r.json().catch(() => null); if (d?.error) addEvent("write", "❌", `Write rejected by ${nodes[idx].id}: ${d.error}`); }
    fetchAllStatus();
  };
  const handleReadAll = async () => {
    setIsReadingAll(true);
    const results = await Promise.allSettled([0, 1, 2].map((i) => fetch(`${BASE(i)}/read`).then((r) => r.ok ? r.json() : null).catch(() => null)));
    setReadResults(results.map((r) => r.status === "fulfilled" ? r.value : null).filter(Boolean));
    setIsReadingAll(false);
  };
  const handleReset = async () => {
    setIsResetting(true);
    await Promise.allSettled([0, 1, 2].map((i) => fetch(`${BASE(i)}/reset`, { method: "POST" }).catch(() => null)));
    setTimeout(() => { setIsResetting(false); fetchAllStatus(); }, 1500);
  };

  const leaders    = nodes.filter((n) => n.isLeader);
  const splitBrain = leaders.length >= 2;
  const topTerm    = Math.max(...nodes.map((n) => n.term));

  return (
    <div className="space-y-4">

      {/* ── Cluster Topology ─────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="section-label">Cluster Topology — Raft-like consensus</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-tertiary">highest term:</span>
            <span className="font-mono text-primary font-medium">{topTerm}</span>
            {splitBrain && <span className="text-red-400 animate-pulse ml-2 font-medium">⚠ SPLIT BRAIN</span>}
          </div>
        </div>

        <div className="flex items-center justify-center gap-0 h-52">
          {nodes.map((node, idx) => (
            <div key={node.id} className="flex items-center">
              <ServerNode node={node} writeValue={writeValue} onPartition={handlePartition} onHeal={handleHeal} onWrite={handleWrite} isResetting={isResetting} />
              {idx < nodes.length - 1 && (
                <ConnectionLine nodeA={node} nodeB={nodes[idx + 1]}
                  heartbeatActive={heartbeatServerId != null && !node.isPartitioned && !nodes[idx + 1].isPartitioned} />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-3 justify-center text-xs text-tertiary">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Leader</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-prominent inline-block" /> Follower</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Isolated</span>
          <span className="flex items-center gap-1"><span className="w-8 border-t border-dashed border-red-500/60 inline-block" /> Partition</span>
        </div>
      </div>

      {/* ── Split Brain ───────────────────────────────────────────────────── */}
      {splitBrain && <SplitBrainPanel leaders={leaders} readResults={readResults} />}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-4 space-y-3">
        <div className="section-label">Write Controls</div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-elevated rounded-button px-3 py-1.5 border border-subtle">
            <span className="text-tertiary text-xs">value</span>
            <input type="text" value={writeValue} onChange={(e) => setWriteValue(e.target.value)}
              className="bg-transparent text-sm text-primary outline-none font-mono w-32" placeholder="leader_data" />
          </div>
          <button onClick={handleReadAll} disabled={isReadingAll || isResetting} className="btn-secondary px-4 py-2">
            {isReadingAll ? "Reading…" : "📖 Read from All"}
          </button>
          <button onClick={handleReset} disabled={isResetting} className="btn-ghost px-4 py-2">
            {isResetting ? "Resetting…" : "Reset"}
          </button>
        </div>
        <div className="text-xs text-tertiary">
          Use the <span className="text-secondary">Write here</span> button on each node above — only the leader accepts writes.
        </div>
      </div>

      {/* ── Read results ─────────────────────────────────────────────────── */}
      {readResults.length > 0 && (
        <div className="rounded-card border border-subtle bg-card p-4 space-y-2 animate-fade-in">
          <div className="section-label mb-2">Read Results — all servers</div>
          {readResults.map((r, i) => <ReadResultRow key={i} result={r} />)}
          {splitBrain && readResults.some((a, i) => readResults.some((b, j) => i !== j && a.value !== b.value)) && (
            <div className="text-xs text-red-400 text-center pt-1">⚠ Divergent values — this is the split brain data conflict</div>
          )}
        </div>
      )}

      {/* ── Timeline + CAP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-subtle bg-card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-subtle">
            <span className="section-label">Election & Partition Timeline</span>
          </div>
          <div className="p-3 space-y-1.5 h-56 overflow-y-auto">
            {timeline.length === 0
              ? <p className="text-center text-tertiary text-xs py-8">Isolate a server to see election events</p>
              : timeline.map((e) => <TimelineEntry key={e.id} entry={e} />)}
          </div>
        </div>

        <div className="rounded-card border border-subtle bg-card/50 p-4 text-xs space-y-3">
          <p className="text-primary font-medium text-sm">Network Partitions & Split Brain (CP trade-off)</p>
          <p className="text-secondary leading-relaxed">
            <span className="text-yellow-400 font-medium">Normal:</span> one leader holds the lock. All writes go through it.
          </p>
          <p className="text-secondary leading-relaxed">
            <span className="text-red-400 font-medium">During partition:</span> the majority group elects a new leader.
            The isolated node still believes it's leader — split brain.
          </p>
          <p className="text-secondary leading-relaxed">
            <span className="text-emerald-400 font-medium">Resolution:</span> term numbers act as logical clocks.
            When the partition heals, the lower-term leader sees a higher term and immediately steps down.
          </p>
          <div className="rounded-card bg-deep border border-subtle p-2 grid grid-cols-3 gap-2 text-center text-xs">
            {[["C","Consistency","✓","text-emerald-400"],["A","Availability","✗","text-red-500"],["P","Partition tol.","✓","text-emerald-400"]].map(([k,label,v,c]) => (
              <div key={k}>
                <div className={`font-bold ${c}`}>{k}</div>
                <div className="text-tertiary">{label}</div>
                <div className={`text-lg ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <p className="text-tertiary text-center">CP system — like <span className="text-secondary">etcd, ZooKeeper, Consul</span></p>
        </div>
      </div>

      {/* ── DB State ──────────────────────────────────────────────────────── */}
      <DbPanel
        title="scenario3:* keys"
        dbType="redis"
        endpoint={`${SERVER_URLS[0]}/scenarios/partitions/cluster-state`}
        pollMs={1500}
      >
        {(data) => (
          <DbTable
            columns={["key", "value"]}
            rows={data?.rows}
            formatters={{
              key:   (v) => <span className="text-tertiary">{v}</span>,
              value: (v, row) =>
                row.key === "leader"
                  ? <span className="text-yellow-400 font-bold">{v}</span>
                  : row.key === "term"
                  ? <span className="text-blue-400">{v}</span>
                  : <span className="text-primary">"{v}"</span>,
            }}
          />
        )}
      </DbPanel>
    </div>
  );
}

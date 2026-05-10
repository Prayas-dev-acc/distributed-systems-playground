const SERVER_COLORS = [
  { text: "text-blue-400",    dot: { outer: "bg-blue-500/15",    mid: "bg-blue-500/30",    inner: "bg-blue-400"    } },
  { text: "text-purple-400",  dot: { outer: "bg-purple-500/15",  mid: "bg-purple-500/30",  inner: "bg-purple-400"  } },
  { text: "text-emerald-400", dot: { outer: "bg-emerald-500/15", mid: "bg-emerald-500/30", inner: "bg-emerald-400" } },
];

const STATUS_DOT = {
  healthy: { outer: "bg-emerald-500/15", mid: "bg-emerald-500/35 animate-pulse", inner: "bg-emerald-400" },
  error:   { outer: "bg-red-500/15",     mid: "bg-red-500/30",                   inner: "bg-red-400"     },
  unknown: { outer: "bg-amber-500/15",   mid: "bg-amber-500/30",                 inner: "bg-amber-400"   },
};

function StatusDot({ status }) {
  const c = STATUS_DOT[status] ?? STATUS_DOT.unknown;
  return (
    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
      <div className={`absolute w-4 h-4 rounded-full ${c.outer}`} />
      <div className={`absolute w-2.5 h-2.5 rounded-full ${c.mid}`} />
      <div className={`absolute w-1.5 h-1.5 rounded-full ${c.inner}`} />
    </div>
  );
}

export default function ServerStatusBar({ servers }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-card border-b border-subtle">
      {servers.map((s, i) => {
        const C = SERVER_COLORS[i];
        const isHealthy = s.status === "healthy";
        const isDown    = s.status === "error";
        return (
          <div
            key={s.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-button border text-xs transition-all duration-200 ${
              isDown
                ? "bg-red-500/5 border-red-500/20"
                : "bg-elevated border-subtle hover:border-prominent"
            }`}
          >
            <StatusDot status={s.status} />
            <span className={`font-medium ${C.text}`}>{s.id}</span>
            <span className="text-tertiary font-mono">:{s.port}</span>
            <span className={`font-mono font-medium ${isHealthy ? "text-emerald-400" : isDown ? "text-red-400" : "text-amber-400"}`}>
              {isHealthy ? "UP" : isDown ? "DOWN" : "?"}
            </span>
            {s.checks && (
              <span className="text-tertiary hidden sm:inline">
                db {s.checks.db === "ok" ? "✓" : "✗"} · redis {s.checks.redis === "ok" ? "✓" : "✗"}
              </span>
            )}
          </div>
        );
      })}
      <div className="ml-auto text-tertiary text-xs font-mono hidden md:block">
        {servers.filter((s) => s.status === "healthy").length}/{servers.length} healthy
      </div>
    </div>
  );
}

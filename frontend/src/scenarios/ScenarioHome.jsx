const SCENARIOS = [
  {
    icon: "⚡",
    label: "Race Conditions",
    subtitle: "Distributed Locking",
    description: "100 concurrent requests increment a shared counter. Without a Redis lock, writes silently overwrite each other. With SETNX locking, every increment is serialized.",
    accent: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    tag: "Redis SETNX · Exponential backoff",
  },
  {
    icon: "🔁",
    label: "Idempotency",
    subtitle: "UNKNOWN Errors",
    description: "A payment request times out mid-flight. Should you retry? With idempotency keys the answer is always yes — the server deduplicates and returns the original result.",
    accent: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    tag: "Idempotency keys · PostgreSQL dedup",
  },
  {
    icon: "🔀",
    label: "Network Partitions",
    subtitle: "Split Brain",
    description: "One server gets isolated. The healthy majority elects a new leader via Raft-like voting. The partitioned node keeps accepting writes — creating a split brain until healing.",
    accent: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    tag: "Leader election · Raft consensus",
  },
  {
    icon: "⏳",
    label: "Eventual Consistency",
    subtitle: "Replication Lag",
    description: "Write to the primary. Replicas receive the update asynchronously via Redis pub/sub. During the lag window, reading from a replica returns stale data — this is an AP system.",
    accent: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    tag: "Redis pub/sub · CAP theorem",
  },
  {
    icon: "⚖️",
    label: "Load Balancing",
    subtitle: "Health Checks",
    description: "Kill a backend mid-traffic. The load balancer detects the failure, stops routing there, and redistributes load. Revive it and watch it rejoin the rotation automatically.",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    tag: "Health checks · Weighted round-robin",
  },
];

const STACK = [
  { label: "3× Node.js",   desc: "ESM + Express backends",   color: "text-emerald-400" },
  { label: "PostgreSQL",   desc: "Counters · idempotency",   color: "text-blue-400"    },
  { label: "Redis",        desc: "Locks · pub/sub · leader", color: "text-red-400"     },
  { label: "Socket.io",   desc: "Live event streaming",      color: "text-purple-400"  },
  { label: "React + Vite", desc: "Interactive frontend",     color: "text-yellow-400"  },
  { label: "Docker",       desc: "Compose orchestration",    color: "text-sky-400"     },
];

export default function ScenarioHome() {
  return (
    <div className="space-y-8 pb-4">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-card bg-gradient-blue-purple flex items-center justify-center mx-auto shadow-glow">
          <span className="text-2xl font-bold text-white">DS</span>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-primary tracking-tight">
            Distributed Systems <span className="text-blue-400">Playground</span>
          </h2>
          <p className="text-secondary text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            Five interactive scenarios demonstrating the hardest problems in distributed systems —
            race conditions, network splits, replication lag, and more. All running live across
            3 real backend nodes.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {["3 live nodes", "Real PostgreSQL", "Redis", "Socket.io events"].map((t) => (
            <span key={t} className="badge badge-gray text-secondary">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Architecture diagram ─────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="section-label mb-5">Architecture</div>

        {/* Browser tier */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-card border border-blue-500/30 bg-blue-500/5">
            <span className="text-lg">🌐</span>
            <div>
              <div className="text-xs font-semibold text-blue-400">Browser</div>
              <div className="text-2xs text-tertiary">React + Vite · Socket.io client</div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-4">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-4 bg-subtle" />
            <div className="text-tertiary text-xs">HTTP + WS</div>
            <div className="w-px h-4 bg-subtle" />
          </div>
        </div>

        {/* Backend tier */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { id: "backend-1", color: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/5"    },
            { id: "backend-2", color: "text-purple-400",  border: "border-purple-500/30",  bg: "bg-purple-500/5"  },
            { id: "backend-3", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
          ].map(({ id, color, border, bg }) => (
            <div key={id} className={`rounded-card border p-3 text-center ${border} ${bg}`}>
              <div className="text-base mb-1">⚙️</div>
              <div className={`text-xs font-semibold ${color}`}>{id}</div>
              <div className="text-2xs text-tertiary mt-0.5">Node.js · ESM</div>
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-4">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-4 bg-subtle" />
            <div className="text-tertiary text-xs">shared state</div>
            <div className="w-px h-4 bg-subtle" />
          </div>
        </div>

        {/* Data tier */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {[
            { icon: "🐘", label: "PostgreSQL", desc: "counters, idempotency keys, replication state", color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/5" },
            { icon: "🔴", label: "Redis",      desc: "distributed locks, pub/sub, leader registry",  color: "text-red-400",  border: "border-red-500/30",  bg: "bg-red-500/5"  },
          ].map(({ icon, label, desc, color, border, bg }) => (
            <div key={label} className={`rounded-card border p-3 text-center ${border} ${bg}`}>
              <div className="text-base mb-1">{icon}</div>
              <div className={`text-xs font-semibold ${color}`}>{label}</div>
              <div className="text-2xs text-tertiary mt-0.5 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scenario cards ───────────────────────────────────────────────────── */}
      <div>
        <div className="section-label mb-4">Scenarios</div>
        <div className="grid grid-cols-1 gap-3">
          {SCENARIOS.map((s) => (
            <div
              key={s.label}
              className={`rounded-card border p-4 flex items-start gap-4 ${s.border} ${s.bg}`}
            >
              <div className={`w-10 h-10 rounded-card border flex items-center justify-center text-xl shrink-0 ${s.border} ${s.bg}`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${s.accent}`}>{s.label}</span>
                  <span className="text-tertiary text-xs">·</span>
                  <span className="text-secondary text-xs">{s.subtitle}</span>
                </div>
                <p className="text-secondary text-xs mt-1.5 leading-relaxed">{s.description}</p>
                <div className="mt-2">
                  <span className="badge badge-gray text-tertiary font-mono text-2xs">{s.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tech stack ───────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card p-5">
        <div className="section-label mb-4">Tech Stack</div>
        <div className="grid grid-cols-3 gap-3">
          {STACK.map(({ label, desc, color }) => (
            <div key={label} className="rounded-button border border-subtle bg-elevated p-3">
              <div className={`text-xs font-semibold ${color}`}>{label}</div>
              <div className="text-2xs text-tertiary mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

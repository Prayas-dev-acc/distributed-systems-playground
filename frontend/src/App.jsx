import { useState } from "react";
import { useServers } from "./hooks/useServers.js";
import ServerStatusBar from "./components/ServerStatusBar.jsx";
import RequestLog from "./components/RequestLog.jsx";
import Scenario1RaceConditions from "./scenarios/Scenario1RaceConditions.jsx";
import Scenario5LoadBalancing from "./scenarios/Scenario5LoadBalancing.jsx";
import Scenario2Idempotency from "./scenarios/Scenario2Idempotency.jsx";
import Scenario4Replication from "./scenarios/Scenario4Replication.jsx";
import Scenario3Partitions from "./scenarios/Scenario3Partitions.jsx";
import ScenarioHome from "./scenarios/ScenarioHome.jsx";

const SCENARIOS = [
  { id: "home",               label: "Home",               subtitle: "Overview",            icon: "🏠", accent: "text-secondary",   border: "border-subtle",         bg: "bg-elevated"      },
  { id: "race-conditions",    label: "Race Conditions",    subtitle: "Distributed Locking", icon: "⚡", accent: "text-yellow-400",  border: "border-yellow-500/30",  bg: "bg-yellow-500/5"  },
  { id: "idempotency",        label: "Idempotency",        subtitle: "UNKNOWN Errors",      icon: "🔁", accent: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/5"    },
  { id: "network-partitions", label: "Network Partitions", subtitle: "Split Brain",         icon: "🔀", accent: "text-red-400",     border: "border-red-500/30",     bg: "bg-red-500/5"     },
  { id: "eventual-consistency",label:"Eventual Consistency",subtitle: "Replication Lag",    icon: "⏳", accent: "text-purple-400",  border: "border-purple-500/30",  bg: "bg-purple-500/5"  },
  { id: "load-balancing",     label: "Load Balancing",     subtitle: "Health Checks",       icon: "⚖️", accent: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
];

function ScenarioContent({ id, serverHealth, sockets }) {
  if (id === "home")                return <ScenarioHome />;
  if (id === "race-conditions")     return <Scenario1RaceConditions serverHealth={serverHealth} sockets={sockets} />;
  if (id === "idempotency")         return <Scenario2Idempotency sockets={sockets} />;
  if (id === "network-partitions")  return <Scenario3Partitions sockets={sockets} />;
  if (id === "eventual-consistency")return <Scenario4Replication sockets={sockets} />;
  if (id === "load-balancing")      return <Scenario5LoadBalancing sockets={sockets} />;
  return null;
}

export default function App() {
  const [activeScenario, setActiveScenario] = useState("home");
  const { serverHealth, sockets, requestLogs } = useServers();
  const active = SCENARIOS.find((s) => s.id === activeScenario);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-deep">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-card/80 backdrop-blur-sm border-b border-subtle z-10">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-button bg-gradient-blue-purple flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">DS</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-primary tracking-tight leading-none">
              Distributed Systems <span className="text-blue-400">Playground</span>
            </h1>
            <p className="text-2xs text-tertiary mt-0.5">Interactive visualization of distributed systems concepts</p>
          </div>
        </div>

        {/* Tech stack pills */}
        <div className="flex items-center gap-1.5">
          {["3 nodes", "PostgreSQL", "Redis", "Socket.io"].map((label) => (
            <span key={label} className="badge badge-gray text-tertiary">{label}</span>
          ))}
        </div>
      </header>

      {/* ── Server status bar ────────────────────────────────────────────────── */}
      <ServerStatusBar servers={serverHealth} />

      {/* ── Scenario tabs ────────────────────────────────────────────────────── */}
      <nav className="shrink-0 flex items-end gap-0.5 px-4 pt-3 pb-0 bg-deep border-b border-subtle">
        {SCENARIOS.map((s) => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveScenario(s.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-button
                          transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                          ${isActive
                            ? "text-primary bg-elevated border border-b-elevated border-subtle -mb-px"
                            : "text-tertiary hover:text-secondary hover:bg-white/[0.03]"
                          }`}
            >
              <span className={`transition-all duration-200 ${isActive ? "opacity-100" : "opacity-60"}`}>
                {s.icon}
              </span>
              <span>{s.label}</span>
              {isActive && (
                <span className={`absolute bottom-0 left-3 right-3 h-px ${
                  s.id === "home" ? "bg-prominent" : s.accent.replace("text-", "bg-")
                }`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">

            {/* Scenario heading — hidden on home tab */}
            {active.id !== "home" && (
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-subtle">
                <div className={`w-10 h-10 rounded-card flex items-center justify-center text-xl shrink-0 ${active.bg} border ${active.border}`}>
                  {active.icon}
                </div>
                <div>
                  <h2 className={`text-base font-semibold tracking-tight ${active.accent}`}>
                    {active.label}
                  </h2>
                  <p className="text-xs text-tertiary mt-0.5">{active.subtitle}</p>
                </div>
              </div>
            )}

            <ScenarioContent
              id={activeScenario}
              serverHealth={serverHealth}
              sockets={sockets}
            />
          </div>
        </main>

        {/* ── Request log sidebar ───────────────────────────────────────────── */}
        <aside className="w-60 shrink-0 border-l border-subtle bg-card overflow-hidden flex flex-col">
          <RequestLog logs={requestLogs} />
        </aside>
      </div>
    </div>
  );
}

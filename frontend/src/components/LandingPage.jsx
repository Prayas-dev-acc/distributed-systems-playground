import { useState } from "react";

const GITHUB_URL = "https://github.com/Prayas-dev-acc/distributed-systems-playground";

const SCENARIOS = [
  {
    icon: "⚡",
    title: "Race Conditions & Distributed Locking",
    desc: "See concurrent writes cause lost updates, then watch Redis locks serialize every increment perfectly.",
    accent: "border-yellow-500/30 bg-yellow-500/5",
    tag:  "text-yellow-400",
  },
  {
    icon: "🔁",
    title: "UNKNOWN Errors & Idempotency",
    desc: "The hardest distributed systems problem: when a request times out, you don't know if it succeeded.",
    accent: "border-blue-500/30 bg-blue-500/5",
    tag:  "text-blue-400",
  },
  {
    icon: "🔀",
    title: "Network Partitions & Split Brain",
    desc: "Simulate network failures, watch leader election happen in real-time, see two nodes both claim to be leader.",
    accent: "border-red-500/30 bg-red-500/5",
    tag:  "text-red-400",
  },
  {
    icon: "⏳",
    title: "Eventual Consistency & Replication Lag",
    desc: "Watch data replicate asynchronously across nodes and experience the read-your-own-writes problem firsthand.",
    accent: "border-purple-500/30 bg-purple-500/5",
    tag:  "text-purple-400",
  },
  {
    icon: "⚖️",
    title: "Load Balancing & Health Checks",
    desc: "Kill servers mid-traffic, watch automatic failover and traffic redistribution with zero dropped requests.",
    accent: "border-emerald-500/30 bg-emerald-500/5",
    tag:  "text-emerald-400",
  },
];

const STACK = [
  "Node.js", "Express", "PostgreSQL", "Redis",
  "React", "Socket.io", "Docker", "Tailwind CSS",
];

const QUICK_START = `git clone https://github.com/Prayas-dev-acc/distributed-systems-playground
cd distributed-systems-playground
docker-compose up
# Open http://localhost:5173`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-2xs font-mono px-2 py-1 rounded border border-subtle text-tertiary hover:text-secondary hover:border-prominent transition-colors"
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

export default function LandingPage() {
  const [formState, setFormState] = useState({ email: "", message: "", submitting: false });
  const formspreeId = import.meta.env.VITE_FORMSPREE_ID;

  return (
    <div className="min-h-screen bg-deep text-primary">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-subtle bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-button bg-gradient-blue-purple flex items-center justify-center">
              <span className="text-xs font-bold text-white">DS</span>
            </div>
            <span className="text-sm font-semibold text-primary">Distributed Systems Playground</span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs px-3 py-1.5"
          >
            View on GitHub →
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-badge border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs font-medium mb-2">
            <span>🚧</span> Infrastructure currently parked
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            <span style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Distributed Systems
            </span>
            <br />
            <span className="text-primary">Playground</span>
          </h1>

          <p className="text-secondary text-lg max-w-xl mx-auto leading-relaxed">
            Interactive visualization of race conditions, split brain, idempotency,
            replication lag, and load balancing — running across 3 real backend nodes
            with PostgreSQL and Redis.
          </p>

          <p className="text-tertiary text-sm">
            Keeping 3 servers + database + cache running 24/7 costs more than my coffee budget,
            so the infrastructure runs on-demand. Request a live demo below.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <a href="#request-demo" className="btn-primary px-6 py-2.5 text-sm">
              Request Live Demo
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-2.5 text-sm"
            >
              View Source Code
            </a>
            <a href="/?live=true" className="text-xs text-tertiary hover:text-secondary transition-colors underline underline-offset-2">
              Running locally? Click here →
            </a>
          </div>
        </section>

        {/* ── Demo request form ─────────────────────────────────────────────── */}
        <section id="request-demo" className="rounded-card border border-blue-500/30 bg-blue-500/5 p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-primary">Request a Live Demo</h2>
            <p className="text-secondary text-sm">I'll spin up the infrastructure and email you a link within 5–15 minutes.</p>
          </div>

          {formspreeId ? (
            <form
              action={`https://formspree.io/f/${formspreeId}`}
              method="POST"
              className="space-y-4 max-w-md mx-auto"
            >
              <input type="hidden" name="_subject" value="Demo Request - Distributed Systems Playground" />
              <input type="hidden" name="_next" value="https://frontend-roan-mu-42.vercel.app/demo-requested" />

              <div>
                <label className="text-xs text-secondary block mb-1.5">Your email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-xs text-secondary block mb-1.5">What would you like to see? (optional)</label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Any specific scenario you're curious about?"
                  className="input w-full resize-none"
                />
              </div>

              <button type="submit" className="btn-primary w-full py-2.5">
                Request Live Demo →
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-tertiary text-sm">Form not configured yet.</p>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-block px-5 py-2"
              >
                Run it locally instead
              </a>
            </div>
          )}
        </section>

        {/* ── Scenarios ─────────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-primary">What This Demo Shows</h2>
            <p className="text-secondary text-sm">Five interactive scenarios, each demonstrating a core distributed systems challenge.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCENARIOS.map((s) => (
              <div key={s.title} className={`rounded-card border p-4 space-y-2 ${s.accent}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className={`text-sm font-semibold ${s.tag}`}>{s.title}</span>
                </div>
                <p className="text-secondary text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Architecture ─────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-primary">Architecture</h2>
          </div>

          <div className="rounded-card border border-subtle bg-card p-6">
            {/* Browser */}
            <div className="flex justify-center mb-3">
              <div className="px-5 py-2 rounded-card border border-blue-500/30 bg-blue-500/5 text-center">
                <div className="text-xs font-semibold text-blue-400">Browser</div>
                <div className="text-2xs text-tertiary">React + Socket.io client</div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center mb-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-4 bg-subtle" />
                <div className="text-tertiary text-2xs">HTTP + WebSocket</div>
                <div className="w-px h-4 bg-subtle" />
              </div>
            </div>

            {/* 3 backends */}
            <div className="grid grid-cols-3 gap-2 mb-3 max-w-sm mx-auto">
              {["backend-1\n:3001", "backend-2\n:3002", "backend-3\n:3003"].map((label, i) => {
                const colors = [
                  "border-blue-500/30 bg-blue-500/5 text-blue-400",
                  "border-purple-500/30 bg-purple-500/5 text-purple-400",
                  "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
                ];
                return (
                  <div key={i} className={`rounded-card border p-2 text-center ${colors[i]}`}>
                    <div className="text-base mb-0.5">⚙️</div>
                    {label.split("\n").map((l, j) => (
                      <div key={j} className={`text-2xs ${j === 0 ? "font-semibold" : "text-tertiary"}`}>{l}</div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Arrow */}
            <div className="flex justify-center mb-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-px h-4 bg-subtle" />
                <div className="text-tertiary text-2xs">shared state</div>
                <div className="w-px h-4 bg-subtle" />
              </div>
            </div>

            {/* Data layer */}
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              <div className="rounded-card border border-blue-500/30 bg-blue-500/5 p-3 text-center">
                <div className="text-base mb-0.5">🐘</div>
                <div className="text-xs font-semibold text-blue-400">PostgreSQL</div>
                <div className="text-2xs text-tertiary">counters · transfers · replication</div>
              </div>
              <div className="rounded-card border border-red-500/30 bg-red-500/5 p-3 text-center">
                <div className="text-base mb-0.5">🔴</div>
                <div className="text-xs font-semibold text-red-400">Redis</div>
                <div className="text-2xs text-tertiary">locks · pub/sub · leader state</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tech stack ───────────────────────────────────────────────────── */}
        <section className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-primary">Tech Stack</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {STACK.map((t) => (
              <span key={t} className="badge badge-gray text-secondary px-3 py-1">{t}</span>
            ))}
          </div>
        </section>

        {/* ── Quick start ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-primary">Quick Start (Local)</h2>
            <p className="text-secondary text-sm">Run the full stack locally with a single command.</p>
          </div>

          <div className="rounded-card border border-subtle bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-subtle">
              <span className="text-2xs text-tertiary font-mono">bash</span>
              <CopyButton text={QUICK_START} />
            </div>
            <pre className="p-4 text-xs font-mono text-secondary leading-relaxed overflow-x-auto">
              {QUICK_START}
            </pre>
          </div>
        </section>

        {/* ── Interview questions ───────────────────────────────────────────── */}
        <section className="rounded-card border border-subtle bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-primary">Interview Questions This Answers</h2>
          <div className="space-y-2">
            {[
              ["What is the CAP theorem?",                          "Scenario 4 — live AP system demo"],
              ["How do you handle race conditions?",               "Scenario 1 — Redis SETNX locking"],
              ["Explain idempotency and why it matters",           "Scenario 2 — safe retry patterns"],
              ["What happens during a network partition?",         "Scenario 3 — leader election live"],
              ["How does replication work? What is eventual consistency?", "Scenario 4 — replication lag"],
              ["How do you implement load balancing and failover?","Scenario 5 — health-check routing"],
            ].map(([q, a]) => (
              <div key={q} className="flex items-start gap-3 text-xs">
                <span className="text-emerald-400 shrink-0">✓</span>
                <span className="text-secondary">{q}</span>
                <span className="text-tertiary ml-auto shrink-0 hidden sm:block">{a}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="text-center space-y-3 pb-4">
          <div className="divider" />
          <p className="text-secondary text-sm font-medium">Built by Prayas Jain</p>
          <div className="flex items-center justify-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-tertiary hover:text-secondary text-xs transition-colors">
              GitHub
            </a>
            <span className="text-subtle">·</span>
            <a href="#request-demo" className="text-tertiary hover:text-secondary text-xs transition-colors">
              Request Demo
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}

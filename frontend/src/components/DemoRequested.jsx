const GITHUB_URL = "https://github.com/Prayas-dev-acc/distributed-systems-playground";

const TIMELINE = [
  { step: 1, icon: "🚀", title: "Deploy infrastructure",  desc: "Spin up 3 backends, PostgreSQL, and Redis on Railway" },
  { step: 2, icon: "📧", title: "Send you the link",       desc: "You'll receive an email with the live demo URL"         },
  { step: 3, icon: "🎮", title: "Demo stays live",         desc: "Explore all 5 scenarios for 24–48 hours"                },
  { step: 4, icon: "🔒", title: "Infrastructure torn down", desc: "Deleted after the demo window to keep costs at $0"     },
];

export default function DemoRequested() {
  return (
    <div className="min-h-screen bg-deep flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">

        {/* Success card */}
        <div className="rounded-card border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-3 animate-fade-in">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-semibold text-primary">Demo Request Received</h1>
          <p className="text-secondary text-sm leading-relaxed">
            Thanks for your interest! I'll spin up the infrastructure and
            send you a live demo link within <span className="text-emerald-400 font-medium">5–15 minutes</span>.
          </p>
          <p className="text-tertiary text-xs">
            Usually faster during business hours (IST).
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-card border border-subtle bg-card p-5 space-y-4">
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">What happens next</p>
          <div className="space-y-3">
            {TIMELINE.map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-button bg-elevated border border-subtle flex items-center justify-center shrink-0 text-sm">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">{title}</p>
                  <p className="text-2xs text-tertiary mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* While you wait */}
        <div className="rounded-card border border-subtle bg-card p-5 space-y-3">
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">While you wait</p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-button border border-subtle bg-elevated hover:border-prominent transition-colors group"
          >
            <span className="text-lg">📂</span>
            <div>
              <p className="text-xs font-medium text-primary group-hover:text-blue-400 transition-colors">Browse the source code</p>
              <p className="text-2xs text-tertiary">GitHub — Prayas-dev-acc/distributed-systems-playground</p>
            </div>
          </a>
        </div>

        <p className="text-center text-tertiary text-xs">
          Questions? Reply to the confirmation email or reach out directly.
        </p>
      </div>
    </div>
  );
}

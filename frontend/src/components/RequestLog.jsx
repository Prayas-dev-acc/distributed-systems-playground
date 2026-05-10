const SERVER_COLOR = {
  "server-1": "text-blue-400",
  "server-2": "text-purple-400",
  "server-3": "text-emerald-400",
};

const METHOD_COLOR = {
  GET:    "text-sky-400",
  POST:   "text-emerald-400",
  PUT:    "text-amber-400",
  PATCH:  "text-amber-400",
  DELETE: "text-red-400",
};

function statusColor(code) {
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-sky-400";
  if (code < 500) return "text-amber-400";
  return "text-red-400";
}

function durationColor(ms) {
  if (ms < 100) return "text-emerald-500";
  if (ms < 500) return "text-amber-500";
  return "text-red-500";
}

export default function RequestLog({ logs }) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-subtle flex items-center justify-between shrink-0">
        <span className="section-label">Request Log</span>
        {logs.length > 0 && (
          <span className="text-2xs font-mono text-tertiary">{logs.length}</span>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="w-6 h-6 rounded-full border border-subtle flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-subtle" />
            </div>
            <p className="text-tertiary text-xs">No requests yet</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="group flex items-center gap-1.5 px-3 py-1.5 border-b border-subtle/50
                         hover:bg-elevated transition-colors duration-100 text-xs"
            >
              {/* Server dot */}
              <div className={`w-1 h-1 rounded-full shrink-0 ${
                log.serverId === "server-1" ? "bg-blue-400" :
                log.serverId === "server-2" ? "bg-purple-400" : "bg-emerald-400"
              }`} />

              {/* Method */}
              <span className={`font-mono font-medium w-8 shrink-0 ${METHOD_COLOR[log.method] ?? "text-secondary"}`}>
                {log.method?.slice(0, 3)}
              </span>

              {/* Path */}
              <span
                className="flex-1 text-secondary truncate font-mono"
                title={log.path}
              >
                {log.path?.replace("/scenarios/", "/")}
              </span>

              {/* Status */}
              <span className={`font-mono font-medium shrink-0 ${statusColor(log.status)}`}>
                {log.status}
              </span>

              {/* Duration */}
              <span className={`font-mono shrink-0 w-10 text-right ${durationColor(log.durationMs)}`}>
                {log.durationMs}ms
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

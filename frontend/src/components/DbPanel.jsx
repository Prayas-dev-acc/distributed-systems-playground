import { useState, useEffect } from "react";

export function DbTable({ columns, rows, formatters = {} }) {
  if (!rows) {
    return (
      <div className="flex items-center justify-center gap-2 py-5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-tertiary text-xs">Loading…</span>
      </div>
    );
  }
  if (!rows.length) {
    return <p className="py-5 text-center text-tertiary text-xs">No rows</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-subtle">
          {columns.map((c) => (
            <th key={c} className="px-3 py-1.5 text-left font-mono text-tertiary font-normal whitespace-nowrap">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-subtle/40 hover:bg-elevated/40 transition-colors">
            {columns.map((c) => (
              <td key={c} className="px-3 py-1.5 font-mono text-secondary">
                {formatters[c] ? formatters[c](row[c], row) : String(row[c] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DbPanel({ title, endpoint, dbType = "postgres", pollMs = 2000, children }) {
  const [data, setData]             = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError]           = useState(false);

  useEffect(() => {
    if (!endpoint) return;
    let mounted = true;
    const poll = async () => {
      try {
        const r = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          const d = await r.json();
          if (mounted) { setData(d); setError(false); setLastUpdate(new Date()); }
        } else if (mounted) { setError(true); }
      } catch { if (mounted) setError(true); }
    };
    poll();
    const id = setInterval(poll, pollMs);
    return () => { mounted = false; clearInterval(id); };
  }, [endpoint, pollMs]);

  return (
    <div className="rounded-card border border-subtle bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dbType === "redis"
            ? <span className="badge badge-red text-2xs">🔴 Redis</span>
            : <span className="badge badge-blue text-2xs">🐘 Postgres</span>
          }
          <span className="font-mono text-xs text-secondary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-tertiary text-2xs font-mono">{lastUpdate.toLocaleTimeString()}</span>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${error ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
        </div>
      </div>
      <div className="overflow-x-auto">
        {children(data)}
      </div>
    </div>
  );
}

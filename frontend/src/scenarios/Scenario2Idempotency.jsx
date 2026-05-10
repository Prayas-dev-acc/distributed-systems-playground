import { useState, useEffect, useRef, useCallback } from "react";
import DbPanel, { DbTable } from "../components/DbPanel.jsx";
import { SERVER_URL } from "../utils/serverUrls.js";

const BASE = `${SERVER_URL}/scenarios/idempotency`;

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function fmtMoney(n) { return `$${Number(n).toLocaleString()}`; }

function timelineEvents(amount, fromName, toName, mode) {
  if (mode === "timeout") return [
    { ms: 0,    icon: "📤", text: `Request sent → server`, ok: true },
    { ms: 700,  icon: "🔑", text: "Idempotency key checked — new request", ok: true },
    { ms: 1300, icon: "🔒", text: "Database transaction started", ok: true },
    { ms: 2100, icon: "📊", text: `Balance check: ${fromName} has sufficient funds`, ok: true },
    { ms: 2900, icon: "💸", text: `Deducted ${fmtMoney(amount)} from ${fromName}`, ok: true },
    { ms: 3500, icon: "💰", text: `Added ${fmtMoney(amount)} to ${toName}`, ok: true },
    { ms: 4100, icon: "✅", text: "Transaction committed to database", ok: true },
    { ms: 4900, icon: "⏰", text: "CLIENT TIMEOUT — 5s limit reached", ok: false, highlight: "timeout" },
    { ms: 5200, icon: "💨", text: "Response was never received by client", ok: false },
    { ms: 5500, icon: "❓", text: "Transfer state: UNKNOWN", ok: false, highlight: "unknown" },
  ];
  if (mode === "retry") return [
    { ms: 0,    icon: "🔁", text: `Retry sent with same request ID`, ok: true },
    { ms: 400,  icon: "🔑", text: "Idempotency key checked…", ok: true },
    { ms: 800,  icon: "📋", text: "Request ID already exists in database!", ok: true },
    { ms: 1100, icon: "🚫", text: "Skipping duplicate transfer execution", ok: true },
    { ms: 1400, icon: "📦", text: "Returning cached result from first execution", ok: true },
    { ms: 1700, icon: "✅", text: "Idempotent retry successful — no double transfer", ok: true, highlight: "success" },
  ];
  return [
    { ms: 0,    icon: "📤", text: "Request sent → server", ok: true },
    { ms: 300,  icon: "🔑", text: "Idempotency key checked — new request", ok: true },
    { ms: 600,  icon: "🔒", text: "Database transaction started", ok: true },
    { ms: 1000, icon: "💸", text: `Deducted ${fmtMoney(amount)} from ${fromName}`, ok: true },
    { ms: 1400, icon: "💰", text: `Added ${fmtMoney(amount)} to ${toName}`, ok: true },
    { ms: 1800, icon: "✅", text: "Transaction committed & response received", ok: true, highlight: "success" },
  ];
}

// ── AccountBox ────────────────────────────────────────────────────────────────
function AccountBox({ account, phase, pendingTransfer, isFrom, isTo }) {
  const unknown   = phase === "unknown";
  const isSender   = unknown && isFrom;
  const isReceiver = unknown && isTo;
  const isGood    = phase === "success" || phase === "retry_success";

  return (
    <div className={`flex-1 rounded-card border-2 p-5 transition-all duration-300 ${
      isSender || isReceiver ? "border-amber-500/60 bg-amber-500/5" :
      isGood                 ? "border-emerald-500/40 bg-emerald-500/5" :
                               "border-subtle bg-card"
    }`}>
      <div className="text-xs text-secondary mb-0.5">{account.name}</div>
      <div className="font-mono text-xs text-tertiary mb-4">id:{account.id}</div>
      <div className="text-center">
        {isSender || isReceiver ? (
          <>
            <div className="text-3xl font-mono font-bold text-tertiary line-through">{fmtMoney(account.balance)}</div>
            <div className="text-4xl text-amber-400 font-bold mt-1 animate-pulse">?</div>
            <div className="text-xs text-amber-400 mt-1">
              {isSender ? `−${fmtMoney(pendingTransfer.amount)} ?` : `+${fmtMoney(pendingTransfer.amount)} ?`}
            </div>
          </>
        ) : (
          <div className={`text-4xl font-mono font-bold transition-colors duration-500 ${isGood ? "text-emerald-400" : "text-primary"}`}>
            {fmtMoney(account.balance)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TransferArrow ─────────────────────────────────────────────────────────────
function TransferArrow({ phase, amount, direction }) {
  const active  = phase === "sending" || phase === "retrying";
  const unknown = phase === "unknown";
  return (
    <div className="flex flex-col items-center justify-center w-28 gap-1.5">
      <div className={`text-xs font-mono transition-colors ${unknown ? "text-amber-400" : active ? "text-blue-400" : "text-tertiary"}`}>
        {direction === "a-to-b" ? "A → B" : "B → A"}
      </div>
      <div className="flex items-center w-full">
        <div className={`flex-1 h-px transition-colors ${unknown ? "bg-amber-500/50" : active ? "bg-blue-500" : "bg-prominent"}`} />
        <div className={`text-lg transition-colors ${unknown ? "text-amber-400" : active ? "text-blue-400 animate-bounce" : "text-prominent"}`}>▶</div>
      </div>
      <div className={`text-sm font-mono font-bold transition-colors ${unknown ? "text-amber-400" : active ? "text-blue-300" : "text-tertiary"}`}>
        {amount ? fmtMoney(amount) : ""}
      </div>
      {unknown && <div className="text-xs text-amber-500 animate-pulse">lost?</div>}
    </div>
  );
}

// ── TimelinePanel ─────────────────────────────────────────────────────────────
function TimelinePanel({ events }) {
  if (!events.length) return null;
  return (
    <div className="rounded-card border border-subtle bg-card overflow-hidden">
      <div className="px-3 py-2.5 border-b border-subtle">
        <span className="section-label">Request Timeline</span>
      </div>
      <div className="p-3 space-y-1">
        {events.map((e, i) => (
          <div key={i} className={`flex items-start gap-2.5 text-xs rounded-button px-2 py-1.5 transition-colors ${
            e.highlight === "timeout" ? "bg-red-500/10 text-red-400" :
            e.highlight === "unknown" ? "bg-amber-500/10 text-amber-400" :
            e.highlight === "success" ? "bg-emerald-500/10 text-emerald-400" :
            e.ok ? "text-secondary" : "text-tertiary"
          }`}>
            <span className="text-base leading-none shrink-0">{e.icon}</span>
            <span className="leading-tight">{e.text}</span>
            {e.ok && !e.highlight && <span className="ml-auto text-emerald-500 shrink-0">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StatusPanel ───────────────────────────────────────────────────────────────
function StatusPanel({ phase, result, retryResult, pendingTransfer, onRetry }) {
  if (phase === "idle") return null;

  if (phase === "sending") return (
    <div className="rounded-card border border-blue-500/30 bg-blue-500/5 p-4 text-center animate-fade-in">
      <div className="text-blue-400 text-sm font-medium animate-pulse">
        {pendingTransfer?.simulateTimeout
          ? "⏳ Request in flight… server responds in 8s but client times out at 5s"
          : "⏳ Processing transfer…"}
      </div>
      <div className="text-xs text-tertiary mt-1 font-mono">{pendingTransfer?.requestId}</div>
    </div>
  );

  if (phase === "success") return (
    <div className="rounded-card border border-emerald-500/30 bg-emerald-500/5 p-4 animate-fade-in">
      <div className="text-emerald-400 text-sm font-medium mb-1">✅ Transfer completed</div>
      <div className="text-xs text-secondary">
        {fmtMoney(result?.transfer?.amount)} transferred ·{" "}
        <span className="font-mono text-secondary">{result?.transfer?.request_id?.slice(0, 12)}…</span>
      </div>
    </div>
  );

  if (phase === "failed") return (
    <div className="rounded-card border border-red-500/30 bg-red-500/5 p-4 animate-fade-in">
      <div className="text-red-400 text-sm font-medium mb-1">❌ Transfer failed</div>
      <div className="text-xs text-secondary">{result?.error}</div>
      <div className="font-mono text-xs text-tertiary mt-1">{pendingTransfer?.requestId?.slice(0, 12)}…</div>
    </div>
  );

  if (phase === "unknown") return (
    <div className="rounded-card border-2 border-amber-500/60 bg-amber-500/5 p-5 space-y-3 animate-slide-down">
      <div className="text-center">
        <div className="text-xl font-bold text-amber-400">⚠ REQUEST STATE: UNKNOWN</div>
        <div className="text-xs text-secondary mt-1">The network response was lost. We have no idea if the transfer happened.</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-card bg-card border border-subtle p-3 space-y-1">
          <div className="text-amber-400 font-medium mb-1.5">What the server knows:</div>
          <div className="text-secondary">✅ Transfer was executed</div>
          <div className="text-secondary">✅ DB transaction committed</div>
          <div className="text-secondary">✅ Balances updated</div>
        </div>
        <div className="rounded-card bg-card border border-subtle p-3 space-y-1">
          <div className="text-amber-400 font-medium mb-1.5">What the client knows:</div>
          <div className="text-tertiary">❓ Did A lose {fmtMoney(pendingTransfer?.amount)}?</div>
          <div className="text-tertiary">❓ Did B gain {fmtMoney(pendingTransfer?.amount)}?</div>
          <div className="text-tertiary">❓ Should we retry?</div>
        </div>
      </div>
      <div className="rounded-button bg-deep border border-subtle p-2.5 text-xs">
        <span className="text-tertiary">Request ID: </span>
        <span className="font-mono text-amber-400">{pendingTransfer?.requestId}</span>
      </div>
      <button onClick={onRetry} className="w-full py-2.5 rounded-button bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors active:scale-[0.98]">
        🔁 Retry with Same Request ID (Idempotent)
      </button>
      <p className="text-xs text-tertiary text-center">Safe to retry — the server will detect the duplicate and return the cached result</p>
    </div>
  );

  if (phase === "retrying") return (
    <div className="rounded-card border border-emerald-500/30 bg-emerald-500/5 p-4 text-center animate-fade-in">
      <div className="text-emerald-400 text-sm animate-pulse">🔁 Retrying with same request ID…</div>
    </div>
  );

  if (phase === "retry_success") return (
    <div className="rounded-card border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-3 animate-fade-in">
      <div className="text-center">
        <div className="text-xl font-bold text-emerald-400">✅ Idempotent Retry Successful!</div>
        <div className="text-xs text-secondary mt-1">Server detected the duplicate and returned the cached result — no double transfer</div>
      </div>
      <div className="rounded-card bg-deep border border-subtle p-3 text-xs space-y-1.5">
        {[
          ["Server response",        <span className="text-emerald-400 font-mono">already_processed</span>],
          ["Transfer amount",        <span className="text-primary">{fmtMoney(retryResult?.transfer?.amount)}</span>],
          ["Originally processed by",<span className="text-primary font-mono">{retryResult?.transfer?.server_id}</span>],
          ["Request ID",             <span className="font-mono text-emerald-400">{retryResult?.transfer?.request_id?.slice(0, 16)}…</span>],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-secondary">{label}</span>
            {val}
          </div>
        ))}
      </div>
      <div className="text-xs text-center text-emerald-600">Balances are correct — the transfer executed exactly once</div>
    </div>
  );

  return null;
}

// ── HistoryTable ──────────────────────────────────────────────────────────────
function HistoryTable({ transfers, retriedIds }) {
  if (!transfers?.length) return <p className="text-center text-tertiary text-xs py-5">No transfers yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-subtle text-tertiary text-left">
            {["Request ID", "Transfer", "Amount", "Status", "Server", "Time"].map((h) => (
              <th key={h} className="pb-2 pr-4 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transfers.map((t, i) => {
            const wasRetried = retriedIds.has(t.request_id);
            return (
              <tr key={i} className="border-b border-subtle/50 hover:bg-elevated/50 transition-colors">
                <td className="py-1.5 pr-4 font-mono text-tertiary">
                  {t.request_id.slice(0, 8)}…
                  {wasRetried && <span className="ml-1 badge badge-green">↩ retried</span>}
                </td>
                <td className="py-1.5 pr-4 text-secondary">{t.from_name} → {t.to_name}</td>
                <td className="py-1.5 pr-4 font-mono text-primary">{fmtMoney(t.amount)}</td>
                <td className="py-1.5 pr-4"><span className="text-emerald-400">✓ {t.status}</span></td>
                <td className="py-1.5 pr-4 font-mono text-tertiary">{t.server_id}</td>
                <td className="py-1.5 text-tertiary">{new Date(t.created_at).toLocaleTimeString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Scenario2Idempotency({ sockets }) {
  const [accounts, setAccounts]               = useState([]);
  const [amount, setAmount]                   = useState(100);
  const [simulateTimeout, setSimulateTimeout] = useState(false);
  const [phase, setPhase]                     = useState("idle");
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [result, setResult]                   = useState(null);
  const [retryResult, setRetryResult]         = useState(null);
  const [timeline, setTimeline]               = useState([]);
  const [history, setHistory]                 = useState([]);
  const [retriedIds, setRetriedIds]           = useState(new Set());
  const timerIds = useRef([]);

  const clearTimers = () => { timerIds.current.forEach(clearTimeout); timerIds.current = []; };
  const animateTimeline = useCallback((events) => {
    clearTimers(); setTimeline([]);
    events.forEach((e) => { const id = setTimeout(() => setTimeline((prev) => [...prev, e]), e.ms); timerIds.current.push(id); });
  }, []);
  useEffect(() => () => clearTimers(), []);

  const fetchAccounts = useCallback(async () => {
    try { const r = await fetch(`${BASE}/accounts`); if (!r.ok) return; const d = await r.json(); setAccounts(d.accounts ?? []); } catch {}
  }, []);
  const fetchHistory = useCallback(async () => {
    try { const r = await fetch(`${BASE}/transfer-history`); if (!r.ok) return; const d = await r.json(); setHistory(d.transfers ?? []); } catch {}
  }, []);

  useEffect(() => { fetchAccounts(); fetchHistory(); }, [fetchAccounts, fetchHistory]);

  useEffect(() => {
    if (!sockets?.length) return;
    const teardowns = sockets.flatMap((socket) => {
      const onCompleted = () => fetchHistory();
      const onReset = () => { setPhase("idle"); setPendingTransfer(null); setResult(null); setRetryResult(null); setTimeline([]); setRetriedIds(new Set()); fetchAccounts(); fetchHistory(); };
      socket.on("scenario2:transfer_completed", onCompleted);
      socket.on("scenario2:reset", onReset);
      return [() => socket.off("scenario2:transfer_completed", onCompleted), () => socket.off("scenario2:reset", onReset)];
    });
    return () => teardowns.forEach((fn) => fn());
  }, [sockets, fetchAccounts, fetchHistory]);

  const sendTransfer = async (fromId, toId) => {
    if (phase === "sending" || phase === "retrying") return;
    const fromAccount = accounts.find((a) => a.id === fromId);
    const toAccount   = accounts.find((a) => a.id === toId);
    if (!fromAccount || !toAccount) return;

    const requestId = uuid();
    const transfer  = { requestId, fromId, toId, fromAccount, toAccount, amount, simulateTimeout };
    setPendingTransfer(transfer); setPhase("sending"); setResult(null); setRetryResult(null);
    animateTimeline(timelineEvents(amount, fromAccount.name, toAccount.name, simulateTimeout ? "timeout" : "success"));

    try {
      const r = await fetch(`${BASE}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, fromAccountId: fromId, toAccountId: toId, amount, simulateTimeout }),
        signal: AbortSignal.timeout(5500),
      });
      const data = await r.json();
      if (!r.ok) { setResult(data); setPhase("failed"); clearTimers(); animateTimeline(timelineEvents(amount, fromAccount.name, toAccount.name, "success")); }
      else { setResult(data); setPhase("success"); fetchAccounts(); fetchHistory(); }
    } catch {
      setPhase("unknown");
      setTimeout(fetchHistory, 500);
      setTimeout(fetchHistory, 2000);
    }
  };

  const retryTransfer = async () => {
    if (!pendingTransfer) return;
    const { requestId, fromId, toId, fromAccount, toAccount, amount: amt } = pendingTransfer;
    setPhase("retrying");
    animateTimeline(timelineEvents(amt, fromAccount.name, toAccount.name, "retry"));
    try {
      const r = await fetch(`${BASE}/transfer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, fromAccountId: fromId, toAccountId: toId, amount: amt, simulateTimeout: false }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await r.json();
      setRetryResult(data); setPhase("retry_success");
      setRetriedIds((prev) => new Set([...prev, requestId]));
      fetchAccounts(); fetchHistory();
    } catch { setPhase("unknown"); }
  };

  const resetAll = async () => {
    clearTimers();
    await fetch(`${BASE}/reset`, { method: "POST" }).catch(() => null);
    setPhase("idle"); setPendingTransfer(null); setResult(null); setRetryResult(null); setTimeline([]); setRetriedIds(new Set());
    fetchAccounts(); fetchHistory();
  };

  const accountA  = accounts[0];
  const accountB  = accounts[1];
  const direction = pendingTransfer ? (pendingTransfer.fromId === accountA?.id ? "a-to-b" : "b-to-a") : "a-to-b";
  const isFromA   = pendingTransfer?.fromId === accountA?.id;
  const showForm  = ["idle", "success", "failed", "retry_success"].includes(phase);

  return (
    <div className="space-y-4">

      {/* ── Accounts ────────────────────────────────────────────────────────── */}
      {accounts.length >= 2 && (
        <div className="flex items-center gap-3">
          <AccountBox account={accountA} phase={phase} pendingTransfer={pendingTransfer} isFrom={isFromA}  isTo={!isFromA} />
          <TransferArrow phase={phase} amount={pendingTransfer?.amount ?? amount} direction={direction} />
          <AccountBox account={accountB} phase={phase} pendingTransfer={pendingTransfer} isFrom={!isFromA} isTo={isFromA} />
        </div>
      )}

      {/* ── Transfer form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-card border border-subtle bg-card p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-elevated rounded-button px-3 py-1.5 border border-subtle">
            <span className="text-tertiary text-xs">$</span>
            <input
              type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="bg-transparent w-20 text-sm text-primary outline-none font-mono"
            />
          </div>

          <button onClick={() => accountA && accountB && sendTransfer(accountA.id, accountB.id)} disabled={!accountA || !accountB} className="btn-primary px-4 py-2">
            Transfer A → B
          </button>
          <button onClick={() => accountA && accountB && sendTransfer(accountB.id, accountA.id)} disabled={!accountA || !accountB}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button font-medium text-sm bg-purple-700 hover:bg-purple-600 text-white transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            Transfer B → A
          </button>

          <button
            onClick={() => setSimulateTimeout((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-button border text-sm transition-all duration-200 ${
              simulateTimeout ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-subtle text-secondary hover:border-prominent"
            }`}
          >
            <div className={`w-8 h-4 rounded-full transition-colors relative ${simulateTimeout ? "bg-amber-600" : "bg-elevated"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${simulateTimeout ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            Simulate Timeout
          </button>

          <button onClick={resetAll} className="btn-ghost ml-auto">Reset</button>
        </div>
      )}

      {/* ── Status panel ──────────────────────────────────────────────────── */}
      <StatusPanel phase={phase} result={result} retryResult={retryResult} pendingTransfer={pendingTransfer} onRetry={retryTransfer} />

      {/* ── Timeline + explanation ─────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <TimelinePanel events={timeline} />
          <div className="rounded-card border border-subtle bg-card/50 p-4 text-xs space-y-3">
            <p className="text-primary font-medium text-sm">The UNKNOWN problem</p>
            <p className="text-secondary leading-relaxed">
              When a network timeout occurs, you can't tell if the server:
              (a) never received the request, (b) failed before committing, or
              (c) <span className="text-amber-400">committed and the response was lost</span>.
              Retrying without idempotency causes duplicate charges.
            </p>
            <p className="text-secondary leading-relaxed">
              <span className="text-emerald-400 font-medium">Solution:</span> The client generates a
              unique <span className="font-mono text-secondary">requestId</span> before sending. On retry,
              the server checks if this ID was already processed and returns the cached result.
            </p>
            <div className="font-mono bg-deep rounded-button p-2.5 text-xs text-tertiary leading-relaxed">
              <div>SELECT * FROM transfer_requests</div>
              <div>WHERE request_id = $requestId</div>
              <div className="text-emerald-500 mt-1">→ found? return cached. not found? execute.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── History ────────────────────────────────────────────────────────── */}
      <div className="rounded-card border border-subtle bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle">
          <span className="section-label">Transfer History</span>
          <button onClick={resetAll} className="btn-ghost text-xs py-1">Reset Accounts</button>
        </div>
        <div className="p-4">
          <HistoryTable transfers={history} retriedIds={retriedIds} />
        </div>
      </div>

      {/* ── DB State ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <DbPanel title="accounts" endpoint={`${BASE}/accounts`} pollMs={1500}>
          {(data) => (
            <DbTable
              columns={["name", "balance"]}
              rows={data?.accounts}
              formatters={{
                balance: (v) => <span className={v < 500 ? "text-amber-400" : "text-emerald-400"}>${v}</span>,
              }}
            />
          )}
        </DbPanel>

        <DbPanel title="transfer_requests" endpoint={`${BASE}/transfer-history`} pollMs={2000}>
          {(data) => (
            <DbTable
              columns={["request_id", "amount", "status"]}
              rows={data?.transfers?.slice(0, 8)}
              formatters={{
                request_id: (v) => <span className="text-tertiary">{v?.slice(0, 8)}…</span>,
                amount:     (v) => `$${v}`,
                status:     (v) => (
                  <span className={v === "completed" ? "text-emerald-400" : "text-amber-400"}>{v}</span>
                ),
              }}
            />
          )}
        </DbPanel>
      </div>
    </div>
  );
}

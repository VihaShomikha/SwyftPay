import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import {
  Upload,
  Download,
  BarChart3,
  Shield,
  Fingerprint,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2,
  RefreshCcw,
} from "lucide-react";

interface PaymentRecord {
  timestamp: string;
  endpoint: string;
  method: string;
  amount: string;
  network: string;
  payTo: string;
  txId?: string;
  status: number;
  correlationId: string;
  attempts?: number;
  simulated?: boolean;
}

interface TrustReport {
  endpoint: string;
  totalRequests: number;
  paidRequests: number;
  successRate: number;
  score: number;
  grade: string;
  flags: string[];
}

function parseRecords(text: string): PaymentRecord[] {
  return text
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as PaymentRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is PaymentRecord => r !== null);
}

function computeTrust(records: PaymentRecord[], endpoint: string): TrustReport {
  const normalize = (url: string) => {
    try {
      const p = new URL(url);
      return `${p.origin}${p.pathname}`;
    } catch {
      return url;
    }
  };

  const relevant = records.filter((r) => normalize(r.endpoint) === normalize(endpoint));
  if (relevant.length === 0) {
    return { endpoint, totalRequests: 0, paidRequests: 0, successRate: 0, score: 50, grade: "C", flags: ["NO_DATA"] };
  }

  const paid = relevant.filter((r) => r.txId);
  const successPaid = paid.filter((r) => r.status >= 200 && r.status < 300);
  const failedPaid = paid.filter((r) => r.status >= 400);
  const rate = paid.length > 0 ? successPaid.length / paid.length : 0;
  const avgAttempts = relevant.reduce((s, r) => s + (r.attempts ?? 1), 0) / relevant.length;

  const score = Math.round(
    Math.min(100, Math.max(0, rate * 70 + (1 - Math.min(avgAttempts - 1, 3) / 3) * 20 + Math.min(relevant.length / 10, 1) * 10)),
  );

  const flags: string[] = [];
  if (failedPaid.length > 0) flags.push("FAILURES_AFTER_PAYMENT");
  if (avgAttempts > 2) flags.push("HIGH_RETRY_COUNT");
  if (rate < 0.5 && paid.length >= 3) flags.push("LOW_SUCCESS_RATE");

  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  return { endpoint, totalRequests: relevant.length, paidRequests: paid.length, successRate: Math.round(rate * 100) / 100, score, grade, flags };
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-400";
    case "B": return "text-green-300";
    case "C": return "text-yellow-400";
    case "D": return "text-orange-400";
    default: return "text-red-400";
  }
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof DollarSign; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-pink-dim flex items-center justify-center">
          <Icon size={14} className="text-pink" strokeWidth={1.5} />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <div className="font-pixel text-sm md:text-base text-text">{value}</div>
      {sub && <div className="mt-1 text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [tab, setTab] = useState<"overview" | "transactions" | "trust">("overview");

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRecords(parseRecords(text));
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then((text) => {
      const parsed = parseRecords(text);
      if (parsed.length > 0) setRecords(parsed);
    });
  }, []);

  const exportCsv = useCallback(() => {
    const header = "timestamp,endpoint,method,amount,network,payTo,txId,status,attempts,simulated\n";
    const rows = records.map((r) =>
      [r.timestamp, r.endpoint, r.method, r.amount, r.network, r.payTo, r.txId ?? "", r.status, r.attempts ?? 1, r.simulated ?? false].join(","),
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "swyftpay-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [records]);

  const analytics = useMemo(() => {
    const paidRecords = records.filter((r) => r.txId && !r.simulated);
    const failedRecords = records.filter((r) => r.status >= 400 && r.txId);
    const simulatedRecords = records.filter((r) => r.simulated);
    const totalAttempts = records.reduce((s, r) => s + (r.attempts ?? 1), 0);
    const endpoints = new Set(records.map((r) => { try { return new URL(r.endpoint).origin + new URL(r.endpoint).pathname; } catch { return r.endpoint; } }));

    const byDay = new Map<string, number>();
    for (const r of paidRecords) {
      const day = r.timestamp.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    const byEndpoint = new Map<string, number>();
    for (const r of paidRecords) {
      try {
        const key = new URL(r.endpoint).pathname;
        byEndpoint.set(key, (byEndpoint.get(key) ?? 0) + 1);
      } catch {
        byEndpoint.set(r.endpoint, (byEndpoint.get(r.endpoint) ?? 0) + 1);
      }
    }

    const topEndpoints = Array.from(byEndpoint.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      total: records.length,
      paid: paidRecords.length,
      failed: failedRecords.length,
      simulated: simulatedRecords.length,
      retries: totalAttempts - records.length,
      uniqueEndpoints: endpoints.size,
      byDay: Array.from(byDay.entries()).sort(),
      topEndpoints,
    };
  }, [records]);

  const trustReports = useMemo(() => {
    const endpoints = new Set(records.map((r) => { try { return new URL(r.endpoint).origin + new URL(r.endpoint).pathname; } catch { return r.endpoint; } }));
    return Array.from(endpoints).map((ep) => computeTrust(records, ep)).sort((a, b) => b.score - a.score);
  }, [records]);

  const hasData = records.length > 0;

  return (
    <main className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-pixel text-lg md:text-xl text-text leading-relaxed">Dashboard</h1>
          <p className="mt-3 text-text-muted text-base">
            Import your transaction log to view analytics, trust scores, and payment history.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <label className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-muted hover:border-border-hover hover:text-text transition-all cursor-pointer">
            <Upload size={14} />
            Import .jsonl
            <input type="file" accept=".jsonl,.json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={handlePaste}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-muted hover:border-border-hover hover:text-text transition-all"
          >
            Paste from clipboard
          </button>
          {hasData && (
            <>
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-muted hover:border-border-hover hover:text-text transition-all"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                onClick={() => setRecords([])}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:border-red-400/30 transition-all"
              >
                <Trash2 size={14} />
                Clear
              </button>
              <span className="text-xs text-text-muted font-mono ml-2">{records.length} records loaded</span>
            </>
          )}
        </motion.div>

        {!hasData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <BarChart3 size={48} className="text-text-muted/20 mb-6" />
            <h3 className="text-lg text-text-muted font-medium mb-2">No data loaded</h3>
            <p className="text-sm text-text-muted/60 max-w-md">
              Import your <code className="text-pink font-mono text-xs">logs/transactions.jsonl</code> file
              to view spend analytics, trust scores, and transaction history.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-6 border-b border-border">
              {(["overview", "transactions", "trust"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t
                      ? "border-pink text-pink"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  {t === "overview" && <BarChart3 size={14} className="inline mr-2" />}
                  {t === "transactions" && <Clock size={14} className="inline mr-2" />}
                  {t === "trust" && <Fingerprint size={14} className="inline mr-2" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  <StatCard icon={DollarSign} label="Total requests" value={String(analytics.total)} />
                  <StatCard icon={CheckCircle} label="Paid" value={String(analytics.paid)} />
                  <StatCard icon={XCircle} label="Failed" value={String(analytics.failed)} />
                  <StatCard icon={RefreshCcw} label="Retries" value={String(analytics.retries)} />
                  <StatCard icon={Shield} label="Simulated" value={String(analytics.simulated)} />
                  <StatCard icon={Fingerprint} label="Endpoints" value={String(analytics.uniqueEndpoints)} />
                </div>

                {analytics.topEndpoints.length > 0 && (
                  <div className="rounded-xl border border-border bg-bg-card p-6 mb-8">
                    <h3 className="font-pixel text-[10px] md:text-xs text-text mb-4 uppercase tracking-wide">Top Endpoints</h3>
                    <div className="space-y-3">
                      {analytics.topEndpoints.map(([ep, count]) => {
                        const max = analytics.topEndpoints[0][1];
                        return (
                          <div key={ep}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-text-muted font-mono text-xs truncate max-w-md">{ep}</span>
                              <span className="text-text font-mono text-xs">{count}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-pink to-purple"
                                style={{ width: `${(count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analytics.byDay.length > 0 && (
                  <div className="rounded-xl border border-border bg-bg-card p-6">
                    <h3 className="font-pixel text-[10px] md:text-xs text-text mb-4 uppercase tracking-wide">Payments by Day</h3>
                    <div className="flex items-end gap-1 h-32">
                      {analytics.byDay.map(([day, count]) => {
                        const max = Math.max(...analytics.byDay.map(([, c]) => c));
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t bg-gradient-to-t from-pink to-purple opacity-80"
                              style={{ height: `${(count / max) * 100}%`, minHeight: "4px" }}
                            />
                            <span className="text-[8px] text-text-muted font-mono">{day.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "transactions" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-[#080808]">
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Time</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Method</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Endpoint</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Status</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Amount</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">TxID</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.slice().reverse().map((r, i) => (
                          <tr key={i} className="border-b border-border/30 hover:bg-bg-card-hover transition-colors">
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{r.timestamp.slice(0, 19)}</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-purple">{r.method}</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted truncate max-w-[200px]">{r.endpoint}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">
                              <span className={r.status >= 200 && r.status < 300 ? "text-green-400" : r.status === 402 ? "text-yellow-400" : "text-red-400"}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{r.amount}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">
                              {r.txId ? (
                                <a
                                  href={`https://allo.info/tx/${r.txId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink hover:underline flex items-center gap-1"
                                >
                                  {r.txId.slice(0, 8)}...
                                  <ExternalLink size={10} />
                                </a>
                              ) : r.simulated ? (
                                <span className="text-yellow-400">simulated</span>
                              ) : (
                                <span className="text-text-muted/30">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{r.attempts ?? 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "trust" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-[#080808]">
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Endpoint</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Score</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Grade</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Success Rate</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Requests</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Paid</th>
                          <th className="text-left py-3 px-4 text-text-muted font-mono text-xs">Flags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trustReports.map((r) => (
                          <tr key={r.endpoint} className="border-b border-border/30 hover:bg-bg-card-hover transition-colors">
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted truncate max-w-[250px]">{r.endpoint}</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text">{r.score}/100</td>
                            <td className="py-2.5 px-4">
                              <span className={`font-pixel text-sm ${gradeColor(r.grade)}`}>{r.grade}</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{Math.round(r.successRate * 100)}%</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{r.totalRequests}</td>
                            <td className="py-2.5 px-4 font-mono text-xs text-text-muted">{r.paidRequests}</td>
                            <td className="py-2.5 px-4">
                              {r.flags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.flags.map((f) => (
                                    <span key={f} className="flex items-center gap-1 text-[10px] text-orange-400 font-mono bg-orange-400/10 px-1.5 py-0.5 rounded">
                                      <AlertTriangle size={8} />
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-text-muted/30 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

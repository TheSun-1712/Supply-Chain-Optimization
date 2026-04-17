import { useEffect, useState } from "react";
import { DatabaseZap } from "lucide-react";
import { LogsTable } from "../components/LogsTable";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { loadAuditLogs } from "../lib/api";
import { formatCurrency } from "../lib/formatters";

export function LogsPage() {
  const { logs } = useProductionData();
  const [auditLogs, setAuditLogs] = useState([]);
  const bestLog = logs.find((entry) => entry.isBest);

  useEffect(() => {
    loadAuditLogs().then(setAuditLogs).catch(() => setAuditLogs([]));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Logs"
        title="RL decision trace"
        description="Inspect policy actions emitted by the reinforcement learning agent and identify the most effective policy decisions."
        aside={
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
            <DatabaseZap size={16} />
            SQL logic uses `profit = (SELECT MAX(profit) FROM logs)`
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:mb-8">
        <MetricCard
          label="Action Events"
          value={logs.length ? `${logs.length}` : "--"}
          hint="Recent RL actions returned by the log query."
          tone="cyan"
        />
        <MetricCard
          label="Top Profit Impact"
          value={bestLog ? formatCurrency(bestLog.profitImpact) : "--"}
          hint="Highest profit impact recorded in current log series."
          tone="emerald"
        />
        <div className="panel flex flex-col justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Optimal Policy</p>
            <p className="mt-4 text-lg font-semibold text-white">{bestLog?.action ?? "Awaiting data"}</p>
          </div>
          <div className="mt-4">
            <StatusPill tone="emerald">{bestLog ? "Optimization Target Flagged" : "Calculating..."}</StatusPill>
          </div>
        </div>
      </div>

      <LogsTable logs={logs} />

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Audit Log</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Authentication and control events stored in the database</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/[0.03] text-left">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-5 py-4 font-medium sm:px-6">Timestamp</th>
                <th className="px-5 py-4 font-medium sm:px-6">User</th>
                <th className="px-5 py-4 font-medium sm:px-6">Level</th>
                <th className="px-5 py-4 font-medium sm:px-6">Event</th>
                <th className="px-5 py-4 font-medium sm:px-6">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {auditLogs.map((entry) => (
                <tr key={`${entry.timestamp}-${entry.eventType}-${entry.message}`}>
                  <td className="px-5 py-4 text-slate-300 sm:px-6">{entry.timestamp}</td>
                  <td className="px-5 py-4 text-cyan-200 sm:px-6">{entry.username}</td>
                  <td className="px-5 py-4 text-slate-300 sm:px-6">{entry.level}</td>
                  <td className="px-5 py-4 text-slate-300 sm:px-6">{entry.eventType}</td>
                  <td className="px-5 py-4 text-slate-300 sm:px-6">{entry.message}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td className="px-5 py-4 text-slate-500 sm:px-6" colSpan={5}>No audit events yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

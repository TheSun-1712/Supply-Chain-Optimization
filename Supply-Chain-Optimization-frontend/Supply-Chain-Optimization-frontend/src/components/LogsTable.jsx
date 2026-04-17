import { BadgeCheck } from "lucide-react";
import { formatCurrency, formatTimestamp } from "../lib/formatters";
import { StatusPill } from "./StatusPill";

export function LogsTable({ logs }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Decision Trace</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Full trace of agent production scheduling decisions</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-white/[0.03] text-left">
            <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
              <th className="px-5 py-4 font-medium sm:px-6">Timestamp</th>
              <th className="px-5 py-4 font-medium sm:px-6">Agent ID</th>
              <th className="px-5 py-4 font-medium sm:px-6">Action Taken</th>
              <th className="px-5 py-4 font-medium sm:px-6">stochastic_noise_value</th>
              <th className="px-5 py-4 font-medium sm:px-6">Profit_Impact</th>
              <th className="px-5 py-4 font-medium sm:px-6 text-right">Optimization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {logs.map((log) => (
              <tr key={`${log.timestamp}-${log.agentId}`} className={log.isBest ? "bg-emerald-400/5" : ""}>
                <td className="px-5 py-4 text-slate-300 sm:px-6">{formatTimestamp(log.timestamp)}</td>
                <td className="px-5 py-4 font-mono text-cyan-200 sm:px-6">{log.agentId}</td>
                <td className="px-5 py-4 text-slate-300 sm:px-6">{log.action}</td>
                <td className="px-5 py-4 font-mono text-slate-200 sm:px-6">{log.stochastic_noise_value.toFixed(2)}</td>
                <td className="px-5 py-4 font-semibold text-emerald-300 sm:px-6">
                  {formatCurrency(log.profitImpact)}
                </td>
                 <td className="px-5 py-4 sm:px-6 text-right">
                  {log.isBest ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      <BadgeCheck size={14} />
                      Optimal Decision
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Standard</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

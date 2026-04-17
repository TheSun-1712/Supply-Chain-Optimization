import { DatabaseZap } from "lucide-react";
import { LogsTable } from "../components/LogsTable";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency } from "../lib/formatters";

export function LogsPage() {
  const { logs } = useProductionData();
  const bestLog = logs.find((entry) => entry.isBest);

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
    </div>
  );
}

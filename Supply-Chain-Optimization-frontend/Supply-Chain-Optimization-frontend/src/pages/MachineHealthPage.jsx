import { Activity, Cpu, Gauge, ShieldAlert, Wrench } from "lucide-react";
import { useMemo } from "react";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProducerAnalysisData } from "../hooks/useProducerAnalysisData.jsx";
import { formatTimestamp } from "../lib/formatters";

export function MachineHealthPage() {
  const { generatedAt, intel } = useProducerAnalysisData();
  const signals = intel?.signals ?? [];
  const watchlist = intel?.watchlist ?? [];

  const machineHealth = useMemo(() => {
    const riskScore = Number(intel?.riskScore || 0);
    const severeSignals = signals.filter((signal) => Number(signal.severity || 0) >= 4).length;
    const healthScore = Math.max(42, Math.min(97, Math.round(93 - riskScore * 7 - severeSignals * 2)));
    const uptime = Math.max(86, Math.min(99.8, Number((healthScore + 3.2).toFixed(1))));
    const maintenanceLoad = Math.max(8, Math.min(42, Math.round(riskScore * 6 + severeSignals * 2)));
    const status = healthScore < 70 ? "At Risk" : healthScore < 82 ? "Watch" : "Healthy";
    return { healthScore, uptime, maintenanceLoad, status, severeSignals };
  }, [intel?.riskScore, signals]);

  return (
    <div>
      <PageHeader
        eyebrow="Machine Health"
        title="Production reliability under supply risk"
        description="Monitor inferred machine stress and maintenance pressure as upstream disruption risk changes."
        aside={
          <div className="flex flex-col items-end gap-2">
            <StatusPill tone={machineHealth.status === "At Risk" ? "rose" : machineHealth.status === "Watch" ? "amber" : "emerald"}>
              {machineHealth.status}
            </StatusPill>
            <StatusPill tone="cyan">
              {generatedAt ? `Latest sync ${formatTimestamp(generatedAt)} UTC` : "Waiting for backend sync"}
            </StatusPill>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:mb-8">
        <MetricCard label="Health Score" value={`${machineHealth.healthScore}%`} hint="Estimated line health under current disruption profile." tone={machineHealth.healthScore < 70 ? "rose" : machineHealth.healthScore < 82 ? "amber" : "emerald"} />
        <MetricCard label="Predicted Uptime" value={`${machineHealth.uptime}%`} hint="Projected stable runtime over next operating window." tone="cyan" />
        <MetricCard label="Maintenance Load" value={`${machineHealth.maintenanceLoad}%`} hint="Expected maintenance demand from stress and volatility." tone="amber" />
        <MetricCard label="Critical Signals" value={`${machineHealth.severeSignals}`} hint="Count of active high-severity risk signals affecting operations." tone={machineHealth.severeSignals > 0 ? "rose" : "emerald"} />
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500"><Cpu size={14} /> Line Stress</p>
            <p className="mt-3 text-sm text-slate-300">
              Elevated when critical parts become volatile. Current signal pressure suggests {machineHealth.status === "At Risk" ? "immediate intervention" : machineHealth.status === "Watch" ? "preventive checks" : "stable line behavior"}.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500"><Gauge size={14} /> Throughput Sensitivity</p>
            <p className="mt-3 text-sm text-slate-300">
              Throughput is most sensitive to parts in watchlist: {(watchlist ?? []).slice(0, 3).join(", ") || "no hotspots detected"}.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500"><Activity size={14} /> Reliability Outlook</p>
            <p className="mt-3 text-sm text-slate-300">
              Maintain spare-part buffers and calibrate preventive schedules before backlog pressure propagates to final assembly.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Action Plan</p>
            <h3 className="text-lg font-semibold text-white">Recommended maintenance actions</h3>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Increase preventive maintenance cadence on bottleneck machines for high-risk component lines.</p>
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Pre-stage critical spares and tooling kits for watchlist-linked part families.</p>
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Run short-interval health diagnostics after supply substitution or material spec changes.</p>
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Coordinate with planning to smooth batch shifts during geopolitical volatility spikes.</p>
          <p className="flex items-start gap-2 rounded-2xl border border-violet-300/20 bg-violet-400/10 px-4 py-3"><Wrench size={16} className="mt-0.5 text-violet-300" />
            If machine status drops to At Risk, prioritize constrained lines and freeze non-critical changeovers until reliability stabilizes.
          </p>
        </div>
      </section>
    </div>
  );
}

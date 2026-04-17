import { Activity, AlertTriangle, Sparkles } from "lucide-react";
import { EnvironmentControls } from "../components/EnvironmentControls";
import { InventoryChart } from "../components/InventoryChart";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency, formatTimestamp } from "../lib/formatters";

export function DashboardPage() {
  const { inventory, controls, setControls, generatedAt } = useProductionData();
  const latest = inventory.at(-1);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="AI-driven production scheduling"
        description="Track how backlog pressure, central fulfillment, and regional inventory shift across 30 simulated days under noisy conditions."
        aside={
          <StatusPill tone="cyan">
            {generatedAt ? `Latest run ${formatTimestamp(generatedAt)} UTC` : "Waiting for backend sync"}
          </StatusPill>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:mb-8">
        <MetricCard
          label="Backlog Pressure"
          value={latest ? `${latest.backlog} units` : "--"}
          hint="Unfulfilled demand accumulating under stochastic load."
          tone="rose"
        />
        <MetricCard
          label="Central Inventory"
          value={latest ? `${latest.centralInv} units` : "--"}
          hint="Primary stock available for rebalancing actions."
          tone="cyan"
        />
        <MetricCard
          label="Projected Profit"
          value={latest ? formatCurrency(latest.profit) : "--"}
          hint="Current RL policy value at the latest timestep."
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <EnvironmentControls controls={controls} setControls={setControls} />
          <InventoryChart data={inventory} />
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Model Guidance</p>
                <h3 className="text-lg font-semibold text-white">Policy interpretation</h3>
              </div>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                Higher <span className="text-cyan-200">Simulation length</span> lets you choose how many days the model should
                simulate.
              </p>
              <p>
                Lower <span className="text-emerald-200">Auto play speed</span> defines how many milliseconds the playback uses
                for each simulated day.
              </p>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Warnings</p>
                <h3 className="text-lg font-semibold text-white">Inventory attention lane</h3>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Backlog trend steepens after day 22 under elevated stochastic noise.</li>
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4">Regional inventory outperforms central stock in the final week, indicating stronger downstream positioning.</li>
            </ul>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Run Health</p>
                <h3 className="text-lg font-semibold text-white">Agent status</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Policy cadence</p>
                <p className="mt-2 text-2xl font-semibold text-white">15 sec refresh</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Primary objective</p>
                <p className="mt-2 text-2xl font-semibold text-white">Maximize profit under disruption</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

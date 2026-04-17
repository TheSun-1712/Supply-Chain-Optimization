import { Activity, AlertTriangle, CloudLightning, Sparkles, Globe } from "lucide-react";
import { EnvironmentControls } from "../components/EnvironmentControls";
import { InventoryChart } from "../components/InventoryChart";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency, formatTimestamp } from "../lib/formatters";

export function DashboardPage() {
  const { inventory, controls, setControls, generatedAt, status } = useProductionData();
  const latest = inventory.at(-1);

  // Live warnings based on actual state
  const warnings = [];
  if (status?.backlog > 20) warnings.push(`Backlog pressure: ${status.backlog} unfulfilled units accumulating.`);
  if (status?.fuelMultiplier > 1.8) warnings.push(`Fuel cost elevated at ${status.fuelMultiplier}x — ordering costs are climbing.`);
  if (status?.weather === "hurricane") warnings.push("Hurricane active — overseas route is BLOCKED for up to 5 days.");
  if (status?.routeStatus === "delayed") warnings.push("Storm: Overseas shipments experiencing 50% delay probability.");
  if (warnings.length === 0) warnings.push("No active warnings. Supply chain operating normally.");

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="AI-driven production scheduling"
        description="Track how backlog pressure, central fulfillment, and regional inventory shift across the simulation under noisy market conditions."
        aside={
          <div className="flex flex-col items-end gap-2">
            <StatusPill tone="cyan">
              {generatedAt ? `Latest run ${formatTimestamp(generatedAt)} UTC` : "Waiting for backend sync"}
            </StatusPill>
            {status?.realWorld?.status === "Real-World Sync" && (
              <StatusPill tone="emerald">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px]">
                  <Globe size={10} />
                  Real-World Sync
                </div>
              </StatusPill>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:mb-8">
        <MetricCard
          label="Backlog Pressure"
          value={status ? `${status.backlog} units` : latest ? `${latest.backlog} units` : "--"}
          hint="Unfulfilled demand accumulating under stochastic load."
          tone="rose"
        />
        <MetricCard
          label="Central Inventory"
          value={status ? `${status.centralInv} units` : latest ? `${latest.centralInv} units` : "--"}
          hint="Primary stock available for rebalancing actions."
          tone="cyan"
        />
        <MetricCard
          label="Cumulative Profit"
          value={status ? formatCurrency(status.cumulativeProfit) : latest ? formatCurrency(latest.profit) : "--"}
          hint="Total gross profit from the current simulation run."
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <EnvironmentControls controls={controls} setControls={setControls} status={status} />
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
                Higher <span className="text-cyan-200">Simulation length</span> lets you choose how many days the model should simulate.
              </p>
              <p>
                Lower <span className="text-emerald-200">Auto play speed</span> defines how many milliseconds the playback uses for each simulated day.
              </p>
              <p>
                Use <span className="text-amber-200">God-Mode disruptions</span> to inject realistic crises, or rely on the <span className="text-emerald-400 font-semibold">Real-World Sync</span> to pull live Singapore weather and WTI oil prices.
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
              {warnings.map((w, i) => (
                <li key={i} className={`rounded-2xl border p-4 ${w.includes("hurricane") || w.includes("BLOCKED") ? "border-rose-400/20 bg-rose-400/5" : w.includes("No active") ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/10 bg-white/5"}`}>
                  {w}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                <Activity size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Run Health</p>
                <h3 className="text-lg font-semibold text-white">Agent status</h3>
              </div>
              {/* Live pulse dot */}
              {status && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-xs text-emerald-400">Live</span>
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Simulation Day</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {status ? `${status.day} / ${status.horizon}` : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Route Status</p>
                  {status?.realWorld?.wind_speed > 0 && (
                    <span className="text-[10px] text-slate-500">{status.realWorld.wind_speed} km/h wind</span>
                  )}
                </div>
                <p className={`mt-2 text-2xl font-semibold ${status?.routeStatus === "blocked" ? "text-rose-300" : status?.routeStatus === "delayed" ? "text-amber-300" : "text-emerald-300"}`}>
                  {status?.routeStatus?.toUpperCase() ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Fuel Multiplier</p>
                  {status?.realWorld?.oil_price > 0 && (
                    <span className="text-[10px] text-slate-500">WTI ${status.realWorld.oil_price}</span>
                  )}
                </div>
                <p className={`mt-2 text-2xl font-semibold ${status?.fuelMultiplier > 2 ? "text-rose-300" : status?.fuelMultiplier > 1.5 ? "text-amber-300" : "text-emerald-300"}`}>
                  {status ? `${status.fuelMultiplier}x` : "--"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

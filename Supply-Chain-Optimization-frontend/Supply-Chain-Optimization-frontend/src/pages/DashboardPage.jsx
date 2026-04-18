import { Activity, AlertTriangle, BrainCircuit, CloudLightning, Sparkles, Globe, CloudSun } from "lucide-react";
import { useEffect, useState } from "react";
import { EnvironmentControls } from "../components/EnvironmentControls";
import { InventoryChart } from "../components/InventoryChart";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency, formatTimestamp } from "../lib/formatters";
import { loadRlModelStatus, trainRlWithProducerData, triggerDisruption } from "../lib/api";

export function DashboardPage() {
  const { inventory, controls, setControls, generatedAt, status, connectionError } = useProductionData();
  const [rlStatus, setRlStatus] = useState(null);
  const [rlBusy, setRlBusy] = useState(false);
  const [rlError, setRlError] = useState(null);
  const latest = inventory.at(-1);

  useEffect(() => {
    let active = true;

    async function refreshRlStatus() {
      try {
        const payload = await loadRlModelStatus();
        if (!active) return;
        setRlStatus(payload);
        setRlError(null);
      } catch (error) {
        if (!active) return;
        setRlError(error.message || "Failed to load RL model status");
      }
    }

    refreshRlStatus();
    const id = window.setInterval(refreshRlStatus, 6000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const startProducerTraining = async () => {
    setRlBusy(true);
    setRlError(null);
    try {
      const payload = await trainRlWithProducerData({ epochs: 25, batchSize: 128, learningRate: 0.0001 });
      if (payload?.status) {
        setRlStatus(payload.status);
      }
    } catch (error) {
      setRlError(error.message || "Could not start RL training");
    } finally {
      setRlBusy(false);
    }
  };

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

      {connectionError && (
        <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
          Backend connection failed: {connectionError}. Start the dashboard API with `uvicorn supply_chain_management.server.api:app --reload --port 8000`.
        </div>
      )}

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
                Use <span className="text-amber-200">Disruptions</span> to inject realistic crises, or rely on the <span className="text-emerald-400 font-semibold">Real-World Sync</span> to pull live Singapore weather and WTI oil prices.
              </p>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200">
                <BrainCircuit size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.24em] text-violet-200/80">RL Model</p>
                <h3 className="text-lg font-semibold text-white">Loaded policy and training</h3>
              </div>
              <StatusPill tone={rlStatus?.training?.status === "running" ? "amber" : "emerald"}>
                {rlStatus?.training?.status === "running" ? "Training" : "Ready"}
              </StatusPill>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p>
                Model file: <span className="text-slate-100">{rlStatus?.modelLoaded ? "Loaded" : "Not found"}</span>
              </p>
              <p>
                Last updated: <span className="text-slate-100">{rlStatus?.modelUpdatedAt ? formatTimestamp(rlStatus.modelUpdatedAt) : "--"}</span>
              </p>
              <p>
                Training message: <span className="text-slate-100">{rlStatus?.training?.message ?? "--"}</span>
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={startProducerTraining}
                disabled={rlBusy || rlStatus?.training?.status === "running"}
                className="rounded-2xl border border-violet-400/30 bg-violet-400/15 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-400/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rlBusy || rlStatus?.training?.status === "running" ? "Training..." : "Train With Producer Data"}
              </button>
            </div>

            {rlError && <p className="mt-3 text-xs text-rose-300">{rlError}</p>}
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
                <CloudSun size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Weather Mode</p>
                <h3 className="text-lg font-semibold text-white">Select operating conditions</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                { id: "hurricane", label: "Hurricane", hint: "Overseas route BLOCKED. Severe delays." },
                { id: "fuel_spike", label: "Fuel Spike", hint: "WTI oil surge. +1.5x cost multiplier." },
                { id: "demand_shock", label: "Demand Shock", hint: "Market surge. 3x regional demand." }
              ].map((option) => {
                const isActive = (option.id === "hurricane" && status?.weather === "hurricane");

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => triggerDisruption(option.id)}
                    className={`rounded-2xl border p-4 text-left text-sm transition ${isActive
                      ? "border-amber-300/60 bg-amber-400/10 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-amber-300/30 hover:bg-white/10"
                      }`}
                  >
                    <p className="font-medium capitalize">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {option.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Warnings</p>
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

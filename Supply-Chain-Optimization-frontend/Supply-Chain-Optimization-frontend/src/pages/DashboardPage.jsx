import { Activity, AlertTriangle, Globe, CloudSun, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { EnvironmentControls } from "../components/EnvironmentControls";
import { InventoryChart } from "../components/InventoryChart";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency, formatTimestamp } from "../lib/formatters";
import { transferCentralToRegional, triggerDisruption } from "../lib/api";

export function DashboardPage() {
  const { inventory, controls, setControls, generatedAt, status, connectionError } = useProductionData();
  const [manualStatus, setManualStatus] = useState(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const displayStatus = manualStatus ?? status;
  const latest = inventory.at(-1);

  const handleManualTransfer = async () => {
    setTransferBusy(true);
    setTransferError(null);
    try {
      const payload = await transferCentralToRegional(25);
      if (payload?.status) {
        setManualStatus(payload.status);
      }
    } catch (error) {
      setTransferError(error?.message || "Transfer failed");
    } finally {
      setTransferBusy(false);
    }
  };

  // Live warnings based on actual state
  const warnings = [];
  if (displayStatus?.backlog > 20) warnings.push(`Backlog pressure: ${displayStatus.backlog} unfulfilled units accumulating.`);
  if (displayStatus?.fuelMultiplier > 1.8) warnings.push(`Fuel cost elevated at ${displayStatus.fuelMultiplier}x — ordering costs are climbing.`);
  if (displayStatus?.weather === "hurricane") warnings.push("Hurricane active — overseas route is BLOCKED for up to 5 days.");
  if (displayStatus?.routeStatus === "delayed") warnings.push("Storm: Overseas shipments experiencing 50% delay probability.");
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
            {displayStatus?.realWorld?.status === "Real-World Sync" && (
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

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:mb-8">
        <MetricCard
          label="Backlog Pressure"
          value={displayStatus ? `${displayStatus.backlog} units` : latest ? `${latest.backlog} units` : "--"}
          hint="Unfulfilled demand accumulating under stochastic load."
          tone="rose"
        />
        <MetricCard
          label="Central Inventory"
          value={displayStatus ? `${displayStatus.centralInv} units` : latest ? `${latest.centralInv} units` : "--"}
          hint="Primary stock available for rebalancing actions."
          tone="cyan"
        />
        <MetricCard
          label="Regional Inventory"
          value={displayStatus ? `${displayStatus.regionalInv} units` : latest ? `${latest.regionalInv} units` : "--"}
          hint="Regional stock available to serve local demand."
          tone="amber"
        />
        <MetricCard
          label="Cumulative Profit"
          value={displayStatus ? formatCurrency(displayStatus.cumulativeProfit) : latest ? formatCurrency(latest.profit) : "--"}
          hint="Total gross profit from the current simulation run."
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <EnvironmentControls controls={controls} setControls={setControls} status={displayStatus} />
          <InventoryChart data={inventory} />
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <ArrowLeftRight size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Stock Rebalance</p>
                <h3 className="text-lg font-semibold text-white">Move central stock to regional</h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Transfer 25 units from central inventory to regional inventory instantly for the current day.
            </p>
            <button
              type="button"
              onClick={handleManualTransfer}
              disabled={transferBusy}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeftRight size={14} />
              {transferBusy ? "Transferring..." : "Transfer 25 Units"}
            </button>
            {transferError && <p className="mt-2 text-xs text-rose-300">{transferError}</p>}
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
                const isActive = (option.id === "hurricane" && displayStatus?.weather === "hurricane");

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
              {displayStatus && (
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
                  {displayStatus ? `${displayStatus.day} / ${displayStatus.horizon}` : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Route Status</p>
                  {displayStatus?.realWorld?.wind_speed > 0 && (
                    <span className="text-[10px] text-slate-500">{displayStatus.realWorld.wind_speed} km/h wind</span>
                  )}
                </div>
                <p className={`mt-2 text-2xl font-semibold ${displayStatus?.routeStatus === "blocked" ? "text-rose-300" : displayStatus?.routeStatus === "delayed" ? "text-amber-300" : "text-emerald-300"}`}>
                  {displayStatus?.routeStatus?.toUpperCase() ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Fuel Multiplier</p>
                  {displayStatus?.realWorld?.oil_price > 0 && (
                    <span className="text-[10px] text-slate-500">WTI ${displayStatus.realWorld.oil_price}</span>
                  )}
                </div>
                <p className={`mt-2 text-2xl font-semibold ${displayStatus?.fuelMultiplier > 2 ? "text-rose-300" : displayStatus?.fuelMultiplier > 1.5 ? "text-amber-300" : "text-emerald-300"}`}>
                  {displayStatus ? `${displayStatus.fuelMultiplier}x` : "--"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

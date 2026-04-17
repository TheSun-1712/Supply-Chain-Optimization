import { AlertTriangle, CloudLightning, Flame, Pause, Play, RefreshCw, SkipForward, TrendingUp } from "lucide-react";
import { useState } from "react";
import { apiPost } from "../lib/api";
import { StatusPill } from "./StatusPill";

export function EnvironmentControls({ controls, setControls, status }) {
  const [disrupting, setDisrupting] = useState(null);

  const updateControl = (field) => (event) => {
    const value = Number(event.target.value);
    setControls((c) => ({ ...c, [field]: value }));
    apiPost("/api/control", { [field === "simulationLength" ? "simulationLength" : "autoPlaySpeed"]: value });
  };

  const disrupt = async (type) => {
    setDisrupting(type);
    await apiPost("/api/disrupt", { type });
    setTimeout(() => setDisrupting(null), 1200);
  };

  const simAction = (path) => () => apiPost(path);

  return (
    <section className="panel p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Environment Control</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Simulation Settings</h3>
        </div>
        <StatusPill tone={status?.autoPlay ? "emerald" : "rose"}>
          {status?.autoPlay ? "▶ Running" : "⏸ Paused"}
        </StatusPill>
      </div>

      {/* Day counter */}
      {status && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">Simulation Progress</span>
          <span className="font-mono text-sm text-cyan-200">
            Day {status.day} / {status.horizon}
          </span>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={simAction("/api/sim/play")}
          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20"
        >
          <Play size={14} /> Auto-Play
        </button>
        <button
          onClick={simAction("/api/sim/pause")}
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
        >
          <Pause size={14} /> Pause
        </button>
        <button
          onClick={simAction("/api/sim/step")}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
        >
          <SkipForward size={14} /> Step
        </button>
        <button
          onClick={simAction("/api/sim/reset")}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-400/20"
        >
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {/* Sliders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <label className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Simulation Length</p>
              <p className="mt-1 text-sm text-slate-400">Days to simulate in the production run.</p>
            </div>
            <span className="font-mono text-sm text-cyan-200">{Math.round(controls.simulationLength)} days</span>
          </div>
          <input
            type="range" min="7" max="365" step="1"
            value={controls.simulationLength}
            onChange={updateControl("simulationLength")}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
          />
        </label>

        <label className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Auto-Play Speed</p>
              <p className="mt-1 text-sm text-slate-400">Multiplier for simulation velocity.</p>
            </div>
            <span className="font-mono text-sm text-emerald-200">{Math.max(1, Math.round(1000 / controls.autoPlaySpeed))}x</span>
          </div>
          <input
            type="range" min="1" max="5" step="1"
            value={Math.max(1, Math.round(1000 / controls.autoPlaySpeed))}
            onChange={(e) => {
              const multiplier = Number(e.target.value);
              const ms = 1000 / multiplier;
              setControls(c => ({ ...c, autoPlaySpeed: ms }));
              apiPost("/api/control", { autoPlaySpeed: ms });
            }}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400"
          />
        </label>
      </div>

      {/* God-Mode Disruptions */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-400" />
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Disruptions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => disrupt("hurricane")}
            disabled={disrupting === "hurricane"}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              disrupting === "hurricane"
                ? "border-blue-400/40 bg-blue-400/20 text-blue-200"
                : "border-blue-400/20 bg-blue-400/10 text-blue-200 hover:bg-blue-400/20"
            }`}
          >
            <CloudLightning size={14} /> Hurricane (5 days)
          </button>
          <button
            onClick={() => disrupt("fuel_spike")}
            disabled={disrupting === "fuel_spike"}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              disrupting === "fuel_spike"
                ? "border-orange-400/40 bg-orange-400/20 text-orange-200"
                : "border-orange-400/20 bg-orange-400/10 text-orange-200 hover:bg-orange-400/20"
            }`}
          >
            <Flame size={14} /> Fuel Spike
          </button>
          <button
            onClick={() => disrupt("demand_shock")}
            disabled={disrupting === "demand_shock"}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              disrupting === "demand_shock"
                ? "border-violet-400/40 bg-violet-400/20 text-violet-200"
                : "border-violet-400/20 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20"
            }`}
          >
            <TrendingUp size={14} /> Demand Shock +200%
          </button>
        </div>
        {disrupting && (
          <p className="mt-2 text-xs text-slate-400 animate-pulse">
            Applying {disrupting.replace("_", " ")} disruption...
          </p>
        )}
      </div>
    </section>
  );
}

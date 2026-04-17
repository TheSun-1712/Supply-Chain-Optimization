import { StatusPill } from "./StatusPill";

export function EnvironmentControls({ controls, setControls }) {
  const updateControl = (field) => (event) => {
    setControls((current) => ({
      ...current,
      [field]: Number(event.target.value),
    }));
  };

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Environment Control</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Simulation Settings</h3>
        </div>
        <StatusPill tone="cyan">Human-readable controls for timeline and playback</StatusPill>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Simulation Length</p>
              <p className="mt-1 text-sm text-slate-400">Choose how many days the production run should simulate.</p>
            </div>
            <span className="font-mono text-sm text-cyan-200">{Math.round(controls.simulationLength)} days</span>
          </div>
          <input
            type="range"
            min="7"
            max="90"
            step="1"
            value={controls.simulationLength}
            onChange={updateControl("simulationLength")}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
          />
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            Run Horizon {Math.round(controls.simulationLength)} days
          </p>
        </label>

        <label className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Auto Play Speed</p>
              <p className="mt-1 text-sm text-slate-400">Set the playback speed in milliseconds for each simulated day.</p>
            </div>
            <span className="font-mono text-sm text-emerald-200">{Math.round(controls.autoPlaySpeed)} ms</span>
          </div>
          <input
            type="range"
            min="100"
            max="3000"
            step="50"
            value={controls.autoPlaySpeed}
            onChange={updateControl("autoPlaySpeed")}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400"
          />
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            Playback Rate {Math.round(controls.autoPlaySpeed)} ms/day
          </p>
        </label>
      </div>
    </section>
  );
}

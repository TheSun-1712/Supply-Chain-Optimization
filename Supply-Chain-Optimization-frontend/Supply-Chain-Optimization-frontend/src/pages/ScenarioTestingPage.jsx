import { useState } from "react";
import { comparePolicies, simulate } from "../lib/api";

const initialState = {
  task_id: "hard",
  central_inventory: 300,
  regional_inventory: 140,
  backlog: 18,
  in_transit_central: 90,
  in_transit_regional: 35,
  demand_forecast_3d: [38, 44, 48],
  weather_condition: "storm",
  overseas_route_status: "delayed",
  fuel_cost_multiplier: 1.2,
  pending_shipments: [],
};

export function ScenarioTestingPage() {
  const [scenario, setScenario] = useState({
    demand_multiplier: 1.4,
    fuel_multiplier: 1.5,
    weather_condition: "storm",
    route_status: "delayed",
  });
  const [comparison, setComparison] = useState(null);
  const [scenarioRun, setScenarioRun] = useState(null);

  async function handleCompare() {
    const response = await comparePolicies({ initial_state: initialState, steps: 18, scenario });
    setComparison(response);
  }

  async function handleScenarioRun() {
    const response = await simulate({
      name: "Scenario stress test",
      initial_state: initialState,
      steps: 18,
      policy: "rl",
      scenario,
      manual_actions: [],
    });
    setScenarioRun(response);
  }

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="section-title">Scenario Testing Panel</h1>
        <p className="section-copy">
          Stress the policy with demand shocks, weather disruptions, fuel inflation, and route degradation, then compare RL decisions against a baseline control strategy.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="panel space-y-4">
          <div className="grid gap-3">
            <label className="text-sm text-slate-700">
              Demand multiplier
              <input className="input mt-2" type="number" step="0.1" value={scenario.demand_multiplier} onChange={(e) => setScenario({ ...scenario, demand_multiplier: Number(e.target.value) })} />
            </label>
            <label className="text-sm text-slate-700">
              Fuel multiplier
              <input className="input mt-2" type="number" step="0.1" value={scenario.fuel_multiplier} onChange={(e) => setScenario({ ...scenario, fuel_multiplier: Number(e.target.value) })} />
            </label>
            <label className="text-sm text-slate-700">
              Weather
              <select className="input mt-2" value={scenario.weather_condition} onChange={(e) => setScenario({ ...scenario, weather_condition: e.target.value })}>
                <option value="clear">Clear</option>
                <option value="storm">Storm</option>
                <option value="hurricane">Hurricane</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Route status
              <select className="input mt-2" value={scenario.route_status} onChange={(e) => setScenario({ ...scenario, route_status: e.target.value })}>
                <option value="open">Open</option>
                <option value="delayed">Delayed</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="button-primary" onClick={handleCompare}>Compare RL vs baseline</button>
            <button className="button-secondary" onClick={handleScenarioRun}>Run stressed simulation</button>
          </div>
        </section>

        <section className="panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">RL profit</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{comparison ? `$${comparison.rl.total_profit.toFixed(0)}` : "--"}</p>
              <p className="mt-2 text-sm text-slate-600">Service {comparison ? `${Math.round(comparison.rl.service_level * 100)}%` : "--"}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Baseline profit</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{comparison ? `$${comparison.baseline.total_profit.toFixed(0)}` : "--"}</p>
              <p className="mt-2 text-sm text-slate-600">Service {comparison ? `${Math.round(comparison.baseline.service_level * 100)}%` : "--"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Scenario readout</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">
              {scenario.weather_condition === "hurricane"
                ? "Hurricane scenario will pressure overseas orders and backlog recovery."
                : "Scenario keeps the planner in a disruption-aware but recoverable operating band."}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Demand is scaled by {scenario.demand_multiplier}x while logistics costs are pinned to {scenario.fuel_multiplier}x. This is useful for validating whether the RL policy remains conservative under route stress.
            </p>
          </div>

          {scenarioRun ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="metric-card">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total profit</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">${scenarioRun.final_kpis.total_profit.toFixed(0)}</p>
              </div>
              <div className="metric-card">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Service level</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{Math.round(scenarioRun.final_kpis.service_level * 100)}%</p>
              </div>
              <div className="metric-card">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ending backlog</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{scenarioRun.final_kpis.backlog}</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

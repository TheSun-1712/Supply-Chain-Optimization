import { startTransition, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { simulate } from "../lib/api";

const defaultState = {
  task_id: "medium",
  central_inventory: 250,
  regional_inventory: 120,
  backlog: 12,
  in_transit_central: 60,
  in_transit_regional: 10,
  demand_forecast_3d: [25, 29, 32],
  weather_condition: "clear",
  overseas_route_status: "open",
  fuel_cost_multiplier: 1.0,
  pending_shipments: [],
};

const manualSeed = [{ step_index: 0, action_type: "order", quantity: 160, supplier: "local", target_shipment_id: null, discount_pct: 0 }];

export function SimulationDashboardPage() {
  const [steps, setSteps] = useState(14);
  const [policy, setPolicy] = useState("rl");
  const [state, setState] = useState(defaultState);
  const [manualActions, setManualActions] = useState(manualSeed);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runSimulation(event) {
    event.preventDefault();
    setLoading(true);
    const payload = {
      name: `${policy.toUpperCase()} simulation`,
      initial_state: state,
      steps,
      policy,
      manual_actions: manualActions,
      scenario: { demand_multiplier: 1.0 },
    };
    try {
      const response = await simulate(payload);
      startTransition(() => setResult(response));
    } finally {
      setLoading(false);
    }
  }

  const chartData = (result?.trajectory ?? []).map((step) => ({
    step: step.step_index + 1,
    central: step.state.central_inventory,
    regional: step.state.regional_inventory,
    backlog: step.state.backlog,
    reward: step.reward,
    profit: step.info.step_profit,
  }));

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="section-title">Simulation Dashboard</h1>
        <p className="section-copy">
          Play the environment step by step with RL, baseline, or manual policy control. Every run stores a trajectory for downstream analytics.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <form className="panel space-y-4" onSubmit={runSimulation}>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" value={policy} onChange={(e) => setPolicy(e.target.value)}>
              <option value="rl">RL policy</option>
              <option value="baseline">Baseline heuristic</option>
              <option value="manual">Manual override</option>
            </select>
            <input className="input" type="number" min="1" max="90" value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
            <input className="input" type="number" value={state.central_inventory} onChange={(e) => setState({ ...state, central_inventory: Number(e.target.value) })} />
            <input className="input" type="number" value={state.regional_inventory} onChange={(e) => setState({ ...state, regional_inventory: Number(e.target.value) })} />
            <input className="input" type="number" value={state.backlog} onChange={(e) => setState({ ...state, backlog: Number(e.target.value) })} />
            <input className="input" type="number" value={state.fuel_cost_multiplier} onChange={(e) => setState({ ...state, fuel_cost_multiplier: Number(e.target.value) })} />
          </div>

          {policy === "manual" ? (
            <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-900">Manual override action</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input className="input" type="number" value={manualActions[0].step_index} onChange={(e) => setManualActions([{ ...manualActions[0], step_index: Number(e.target.value) }])} />
                <select className="input" value={manualActions[0].action_type} onChange={(e) => setManualActions([{ ...manualActions[0], action_type: e.target.value }])}>
                  <option value="noop">No-op</option>
                  <option value="order">Order</option>
                  <option value="transfer">Transfer</option>
                  <option value="expedite">Expedite</option>
                  <option value="discount">Discount</option>
                </select>
                <input className="input" type="number" value={manualActions[0].quantity} onChange={(e) => setManualActions([{ ...manualActions[0], quantity: Number(e.target.value) }])} />
                <select className="input" value={manualActions[0].supplier} onChange={(e) => setManualActions([{ ...manualActions[0], supplier: e.target.value }])}>
                  <option value="local">Local</option>
                  <option value="overseas">Overseas</option>
                </select>
              </div>
            </div>
          ) : null}

          <button className="button-primary" type="submit" disabled={loading}>{loading ? "Running simulation..." : "Run simulation"}</button>
        </form>

        <section className="panel">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Profit</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{result ? `$${result.final_kpis.total_profit.toFixed(0)}` : "--"}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Service level</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{result ? `${Math.round(result.final_kpis.service_level * 100)}%` : "--"}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ending backlog</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{result?.final_kpis.backlog ?? "--"}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Policy</p>
              <p className="mt-2 text-3xl font-semibold uppercase text-slate-950">{result?.policy ?? "--"}</p>
            </div>
          </div>

          <div className="mt-6 h-80 rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="step" stroke="#475569" />
                <YAxis stroke="#475569" />
                <Tooltip />
                <Line type="monotone" dataKey="central" stroke="#0f766e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="regional" stroke="#0f172a" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="backlog" stroke="#b45309" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Simulation playback</h2>
            <p className="mt-2 text-sm text-slate-600">Step-by-step trajectory across state, action, reward, and profit impact.</p>
          </div>
        </div>
        <div className="mt-5 table-shell">
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>State</th>
                <th>Action</th>
                <th>Reward</th>
                <th>Profit</th>
                <th>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {(result?.trajectory ?? []).map((step) => (
                <tr key={step.step_index}>
                  <td>{step.step_index + 1}</td>
                  <td>
                    C:{step.state.central_inventory} / R:{step.state.regional_inventory}
                    <div className="text-xs text-slate-500">Backlog {step.state.backlog}</div>
                  </td>
                  <td className="capitalize">
                    {step.action.action_type} {step.action.quantity ? `(${step.action.quantity})` : ""}
                  </td>
                  <td>{step.reward.toFixed(3)}</td>
                  <td>${step.info.step_profit.toFixed(2)}</td>
                  <td>{step.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

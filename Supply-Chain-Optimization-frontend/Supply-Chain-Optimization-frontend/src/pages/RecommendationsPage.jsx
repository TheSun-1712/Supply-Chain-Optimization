import { useState } from "react";
import { recommendAction } from "../lib/api";

const defaultState = {
  task_id: "medium",
  central_inventory: 250,
  regional_inventory: 110,
  backlog: 24,
  in_transit_central: 80,
  in_transit_regional: 20,
  demand_forecast_3d: [28, 33, 31],
  weather_condition: "storm",
  overseas_route_status: "delayed",
  fuel_cost_multiplier: 1.3,
  pending_shipments: [],
};

export function RecommendationsPage() {
  const [state, setState] = useState(defaultState);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const next = await recommendAction(state);
      setResult(next);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="section-title">AI Recommendations Panel</h1>
        <p className="section-copy">
          Send a normalized environment state into the CQL decision engine and get a production-style recommendation with confidence, reward expectation, and operator-facing reasoning.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="panel space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" value={state.task_id} onChange={(e) => setState({ ...state, task_id: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input className="input" type="number" value={state.fuel_cost_multiplier} onChange={(e) => setState({ ...state, fuel_cost_multiplier: Number(e.target.value) })} />
            <input className="input" type="number" value={state.central_inventory} onChange={(e) => setState({ ...state, central_inventory: Number(e.target.value) })} />
            <input className="input" type="number" value={state.regional_inventory} onChange={(e) => setState({ ...state, regional_inventory: Number(e.target.value) })} />
            <input className="input" type="number" value={state.backlog} onChange={(e) => setState({ ...state, backlog: Number(e.target.value) })} />
            <input className="input" type="number" value={state.in_transit_central} onChange={(e) => setState({ ...state, in_transit_central: Number(e.target.value) })} />
            <input className="input" type="number" value={state.in_transit_regional} onChange={(e) => setState({ ...state, in_transit_regional: Number(e.target.value) })} />
            <select className="input" value={state.weather_condition} onChange={(e) => setState({ ...state, weather_condition: e.target.value })}>
              <option value="clear">Clear</option>
              <option value="storm">Storm</option>
              <option value="hurricane">Hurricane</option>
            </select>
            <select className="input" value={state.overseas_route_status} onChange={(e) => setState({ ...state, overseas_route_status: e.target.value })}>
              <option value="open">Open</option>
              <option value="delayed">Delayed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {state.demand_forecast_3d.map((value, index) => (
              <input
                key={index}
                className="input"
                type="number"
                value={value}
                onChange={(e) => {
                  const next = [...state.demand_forecast_3d];
                  next[index] = Number(e.target.value);
                  setState({ ...state, demand_forecast_3d: next });
                }}
              />
            ))}
          </div>
          <button className="button-primary" disabled={loading} type="submit">
            {loading ? "Scoring state..." : "Recommend action"}
          </button>
          {error ? <p className="text-sm text-amber-700">{error}</p> : null}
        </form>

        <section className="panel">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Recommended Move</p>
          {result ? (
            <>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                {result.action_type === "order"
                  ? `Order ${result.quantity} units from ${result.supplier}`
                  : result.action_type === "transfer"
                    ? `Transfer ${result.quantity} units to the regional node`
                    : result.action_type === "expedite"
                      ? "Expedite the most delayed inbound shipment"
                      : result.action_type === "discount"
                        ? `Discount-driven move with ${result.quantity} demand-weighted intensity`
                        : "Hold current plan"}
              </h2>
              <p className="mt-4 rounded-3xl bg-[var(--accent-soft)] px-4 py-3 text-sm leading-6 text-slate-700">{result.reasoning}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Confidence</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{Math.round(result.confidence_score * 100)}%</p>
                </div>
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Expected reward</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{result.expected_reward.toFixed(2)}</p>
                </div>
                <div className="metric-card">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Supplier</p>
                  <p className="mt-2 text-3xl font-semibold capitalize text-slate-950">{result.supplier}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Submit a state to see the policy’s next best action and a planner-readable explanation.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

from __future__ import annotations

import dataclasses

from sqlalchemy.orm import Session

from ...env import RetailSupplyChainEnv
from ...schema import Action, Shipment
from ..database.models import SimulationRun, SimulationStep
from ..schemas.domain import (
    ManualAction,
    PolicyComparisonResponse,
    PolicyOutcome,
    RecommendationResponse,
    ScenarioConfig,
    SimulationKPIs,
    SimulationRequest,
    SimulationResponse,
    SystemState,
    TrajectoryStep,
)
from .recommendation_service import get_rl_engine


def _state_to_env(state: SystemState, steps: int, scenario: ScenarioConfig) -> RetailSupplyChainEnv:
    env = RetailSupplyChainEnv(task_id=state.task_id, seed=17, custom_horizon=steps)
    env.reset()
    env.inventory_central = state.central_inventory
    env.inventory_regional = state.regional_inventory
    env.backlog = state.backlog
    env.fuel_cost_multiplier = scenario.fuel_multiplier or state.fuel_cost_multiplier
    env.weather_condition = scenario.weather_condition or state.weather_condition
    env.overseas_route_status = scenario.route_status or state.overseas_route_status
    env.manual_weather_override = steps
    scaled_demand = [max(0, int(round(v * scenario.demand_multiplier))) for v in state.demand_forecast_3d]
    demand_series = list(env.cfg.demand_series)
    for idx in range(min(steps, len(demand_series))):
        demand_series[idx] = scaled_demand[idx % len(scaled_demand)]
    env.cfg = dataclasses.replace(
        env.cfg,
        horizon_days=steps,
        demand_series=demand_series,
        fuel_volatility=0.0 if scenario.fuel_multiplier else env.cfg.fuel_volatility,
    )
    env.pending_shipments = [
        Shipment(
            shipment_id=index + 1,
            quantity=shipment.quantity,
            eta_days=shipment.eta_days,
            expedited=shipment.expedited,
            source=shipment.source,
            destination=shipment.destination,
        )
        for index, shipment in enumerate(state.pending_shipments)
    ]
    if state.in_transit_central > 0 and not any(s.destination == "central" for s in env.pending_shipments):
        env.pending_shipments.append(
            Shipment(
                shipment_id=len(env.pending_shipments) + 1,
                quantity=state.in_transit_central,
                eta_days=2,
                expedited=False,
                source="overseas",
                destination="central",
            )
        )
    if state.in_transit_regional > 0 and not any(s.destination == "regional" for s in env.pending_shipments):
        env.pending_shipments.append(
            Shipment(
                shipment_id=len(env.pending_shipments) + 1,
                quantity=state.in_transit_regional,
                eta_days=1,
                expedited=False,
                source="central_hub",
                destination="regional",
            )
        )
    return env


def _observation_to_state(env_obs) -> SystemState:
    in_transit_central = sum(s.quantity for s in env_obs.in_transit if s.destination == "central")
    in_transit_regional = sum(s.quantity for s in env_obs.in_transit if s.destination == "regional")
    return SystemState(
        task_id=env_obs.task_id,
        central_inventory=env_obs.inventory_central,
        regional_inventory=env_obs.inventory_regional,
        backlog=env_obs.backlog,
        in_transit_central=in_transit_central,
        in_transit_regional=in_transit_regional,
        demand_forecast_3d=list(env_obs.demand_forecast_3d),
        weather_condition=env_obs.weather_condition,
        overseas_route_status=env_obs.overseas_route_status,
        fuel_cost_multiplier=env_obs.fuel_cost_multiplier,
        pending_shipments=[
            {
                "quantity": shipment.quantity,
                "eta_days": shipment.eta_days,
                "source": shipment.source,
                "destination": shipment.destination,
                "expedited": shipment.expedited,
            }
            for shipment in env_obs.in_transit
        ],
    )


def _baseline_action(state: SystemState, current_day_shipments: list) -> RecommendationResponse:
    if state.regional_inventory < state.demand_forecast_3d[0] + max(10, state.backlog // 2) and state.central_inventory > 0:
        return RecommendationResponse(
            action_type="transfer",
            quantity=min(150, max(40, state.demand_forecast_3d[0] * 2)),
            supplier="local",
            confidence_score=0.72,
            expected_reward=0.2,
            reasoning="Regional stock is below near-term demand, so the baseline rebalances central inventory.",
        )
    if state.backlog > 25 or sum(state.demand_forecast_3d) / 3 > 28:
        supplier = "local" if state.overseas_route_status != "open" else "overseas"
        return RecommendationResponse(
            action_type="order",
            quantity=180,
            supplier=supplier,
            confidence_score=0.68,
            expected_reward=0.18,
            reasoning="Backlog and demand pressure trigger a replenishment order in the heuristic baseline.",
        )
    delayed = next((shipment for shipment in current_day_shipments if shipment.eta_days > 1), None)
    if delayed and state.backlog > 10:
        return RecommendationResponse(
            action_type="expedite",
            quantity=0,
            supplier="local",
            confidence_score=0.61,
            expected_reward=0.11,
            reasoning="The heuristic expedites an inbound shipment to protect fill rate.",
        )
    return RecommendationResponse(
        action_type="noop",
        quantity=0,
        supplier="local",
        confidence_score=0.56,
        expected_reward=0.07,
        reasoning="The heuristic sees enough supply coverage and waits.",
    )


def _manual_lookup(manual_actions: list[ManualAction]) -> dict[int, ManualAction]:
    return {action.step_index: action for action in manual_actions}


def _to_env_action(reco: RecommendationResponse, env: RetailSupplyChainEnv) -> Action:
    target_shipment_id = None
    if reco.action_type == "expedite":
        delayed = next((shipment for shipment in env.pending_shipments if shipment.eta_days > 1), None)
        target_shipment_id = delayed.shipment_id if delayed else None
    discount_pct = round(min(0.5, reco.quantity / 1000.0), 2) if reco.action_type == "discount" else 0.0
    return Action(
        operation=reco.action_type,
        quantity=reco.quantity,
        supplier=reco.supplier,
        target_shipment_id=target_shipment_id,
        discount_pct=discount_pct,
        rationale=reco.reasoning,
    )


def _manual_to_response(action: ManualAction) -> RecommendationResponse:
    return RecommendationResponse(
        action_type=action.action_type,
        quantity=action.quantity,
        supplier=action.supplier,
        confidence_score=1.0,
        expected_reward=0.0,
        reasoning="Manual override supplied by the planner.",
    )


def run_simulation(db: Session, request: SimulationRequest) -> SimulationResponse:
    env = _state_to_env(request.initial_state, request.steps, request.scenario)
    obs = env._observation()
    engine = get_rl_engine()
    manual_map = _manual_lookup(request.manual_actions)

    run = SimulationRun(
        name=request.name,
        task_id=request.initial_state.task_id,
        policy=request.policy,
        steps_requested=request.steps,
        scenario=request.scenario.model_dump(),
        initial_state=request.initial_state.model_dump(),
    )
    db.add(run)
    db.flush()

    trajectory: list[TrajectoryStep] = []
    rewards: list[float] = []
    services: list[float] = []

    for step_index in range(request.steps):
        state = _observation_to_state(obs)
        if request.policy == "rl":
            pred = engine.recommend_response(state)
        elif request.policy == "manual":
            pred = _manual_to_response(manual_map.get(step_index, ManualAction(step_index=step_index)))
        else:
            pred = _baseline_action(state, env.pending_shipments)

        env_action = _to_env_action(pred, env)
        next_obs, reward, done, info = env.step(env_action)

        rewards.append(reward.value)
        services.append(info["service_level"])

        step_record = TrajectoryStep(
            step_index=step_index,
            state=state.model_dump(),
            action={
                "action_type": pred.action_type,
                "quantity": pred.quantity,
                "supplier": pred.supplier,
                "target_shipment_id": env_action.target_shipment_id,
                "discount_pct": env_action.discount_pct,
            },
            reward=reward.value,
            expected_reward=pred.expected_reward,
            confidence_score=pred.confidence_score,
            reasoning=pred.reasoning,
            info=info,
        )
        trajectory.append(step_record)

        db.add(
            SimulationStep(
                run_id=run.id,
                step_index=step_index,
                action_type=pred.action_type,
                quantity=pred.quantity,
                supplier=pred.supplier,
                reward=reward.value,
                profit=info["step_profit"],
                service_level=info["service_level"],
                backlog=next_obs.backlog,
                state_snapshot=step_record.state,
            )
        )
        obs = next_obs
        if done:
            break

    run.final_state = _observation_to_state(obs).model_dump()
    run.total_profit = obs.cumulative_profit
    run.avg_service_level = sum(services) / max(1, len(services))
    run.ending_backlog = obs.backlog
    db.commit()

    return SimulationResponse(
        run_id=run.id,
        policy=request.policy,
        trajectory=trajectory,
        final_kpis=SimulationKPIs(
            total_profit=round(obs.cumulative_profit, 2),
            service_level=round(run.avg_service_level, 4),
            backlog=obs.backlog,
            average_reward=round(sum(rewards) / max(1, len(rewards)), 4),
        ),
    )


def compare_policies(db: Session, initial_state: SystemState, steps: int, scenario: ScenarioConfig) -> PolicyComparisonResponse:
    rl_response = run_simulation(
        db,
        SimulationRequest(name="RL Comparison", initial_state=initial_state, steps=steps, policy="rl", scenario=scenario),
    )
    baseline_response = run_simulation(
        db,
        SimulationRequest(name="Baseline Comparison", initial_state=initial_state, steps=steps, policy="baseline", scenario=scenario),
    )
    return PolicyComparisonResponse(
        rl=PolicyOutcome(
            policy="rl",
            total_profit=rl_response.final_kpis.total_profit,
            service_level=rl_response.final_kpis.service_level,
            backlog=rl_response.final_kpis.backlog,
        ),
        baseline=PolicyOutcome(
            policy="baseline",
            total_profit=baseline_response.final_kpis.total_profit,
            service_level=baseline_response.final_kpis.service_level,
            backlog=baseline_response.final_kpis.backlog,
        ),
    )

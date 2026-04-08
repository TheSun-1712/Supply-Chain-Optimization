from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np

from schema import Action, Observation, Reward, Shipment, State


@dataclass(frozen=True)
class TaskConfig:
    task_id: str
    description: str
    horizon_days: int
    initial_inventory: int
    unit_price: float
    unit_order_cost: float
    fixed_order_cost: float
    holding_cost: float
    backlog_cost: float
    expedite_cost: float
    lead_time_min: int
    lead_time_max: int
    disruption_probability: float
    disruption_delay: int
    discount_sensitivity: float
    demand_series: List[int]
    target_inventory: int


class RetailSupplyChainEnv:
    """
    Real-world simulation: single-SKU retail replenishment under uncertain demand and supplier delays.
    The agent decides how much to order, when to expedite, and whether to run discounts.
    """

    metadata = {"version": "2.0.0", "domain": "retail-demand-planning"}

    TASKS: Dict[str, TaskConfig] = {
        "easy": TaskConfig(
            task_id="easy",
            description="Stable weekday demand with short lead times.",
            horizon_days=14,
            initial_inventory=95,
            unit_price=24.0,
            unit_order_cost=9.0,
            fixed_order_cost=28.0,
            holding_cost=0.6,
            backlog_cost=3.5,
            expedite_cost=18.0,
            lead_time_min=1,
            lead_time_max=2,
            disruption_probability=0.02,
            disruption_delay=1,
            discount_sensitivity=0.30,
            demand_series=[18, 16, 17, 19, 20, 22, 21, 20, 19, 18, 17, 19, 20, 21],
            target_inventory=85,
        ),
        "medium": TaskConfig(
            task_id="medium",
            description="Promotional demand spikes with moderate lead times.",
            horizon_days=21,
            initial_inventory=130,
            unit_price=26.0,
            unit_order_cost=10.0,
            fixed_order_cost=36.0,
            holding_cost=0.8,
            backlog_cost=4.3,
            expedite_cost=22.0,
            lead_time_min=2,
            lead_time_max=4,
            disruption_probability=0.08,
            disruption_delay=2,
            discount_sensitivity=0.45,
            demand_series=[20, 21, 19, 24, 28, 34, 36, 29, 26, 24, 23, 22, 25, 27, 31, 35, 33, 28, 24, 22, 21],
            target_inventory=120,
        ),
        "hard": TaskConfig(
            task_id="hard",
            description="Peak-season volatility, long lead times, and frequent supplier disruption.",
            horizon_days=28,
            initial_inventory=170,
            unit_price=27.0,
            unit_order_cost=11.5,
            fixed_order_cost=42.0,
            holding_cost=1.0,
            backlog_cost=5.4,
            expedite_cost=30.0,
            lead_time_min=3,
            lead_time_max=6,
            disruption_probability=0.18,
            disruption_delay=2,
            discount_sensitivity=0.55,
            demand_series=[26, 24, 27, 29, 32, 34, 38, 42, 46, 51, 49, 44, 41, 36, 33, 31, 34, 39, 45, 52, 56, 53, 47, 43, 39, 36, 34, 32],
            target_inventory=150,
        ),
    }

    def __init__(self, task_id: str = "medium", seed: int = 7):
        if task_id not in self.TASKS:
            raise ValueError(f"Unknown task_id '{task_id}'. Expected one of {list(self.TASKS)}")
        self.task_id = task_id
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        self._shipment_counter = 0
        self.reset()

    def reset(self) -> Observation:
        self.cfg = self.TASKS[self.task_id]
        self.day = 0
        self.inventory = self.cfg.initial_inventory
        self.backlog = 0
        self.pending_shipments: List[Shipment] = []
        self.demand_history: List[int] = []
        self.service_history: List[float] = []
        self.reward_history: List[float] = []
        self.cumulative_profit = 0.0
        self.no_progress_steps = 0
        self.done = False
        self._last_demand = 0
        return self._observation()

    def state(self) -> State:
        return State(
            task_id=self.task_id,
            day=self.day,
            inventory=self.inventory,
            backlog=self.backlog,
            pending_shipments=list(self.pending_shipments),
            demand_history=list(self.demand_history),
            reward_history=list(self.reward_history),
            cumulative_profit=self.cumulative_profit,
            no_progress_steps=self.no_progress_steps,
            done=self.done,
            config=self.cfg.__dict__.copy(),
        )

    def step(self, action: Action) -> Tuple[Observation, Reward, bool, Dict[str, Any]]:
        if self.done:
            raise RuntimeError("Episode is done. Call reset() to start a new episode.")

        action = Action.model_validate(action)
        prev_backlog = self.backlog

        arrivals = self._process_shipments()
        op_cost = self._apply_action(action)

        demand = self._sample_demand(self.day, action.discount_pct)
        total_to_fill = demand + self.backlog
        fulfilled = min(self.inventory, total_to_fill)
        self.inventory -= fulfilled
        self.backlog = max(0, total_to_fill - fulfilled)

        served_today = min(fulfilled, demand)
        service_level = served_today / max(1, demand)
        self.service_history.append(service_level)
        self.demand_history.append(demand)
        self._last_demand = demand

        revenue = served_today * self.cfg.unit_price * (1.0 - action.discount_pct)
        holding = self.inventory * self.cfg.holding_cost
        backlog_penalty = self.backlog * self.cfg.backlog_cost
        step_profit = revenue - op_cost - holding - backlog_penalty
        self.cumulative_profit += step_profit

        reward = self._build_reward(
            step_profit=step_profit,
            demand=demand,
            fulfilled=fulfilled,
            prev_backlog=prev_backlog,
            action=action,
        )
        self.reward_history.append(reward.value)

        if self.backlog >= prev_backlog and action.operation == "noop":
            self.no_progress_steps += 1
        else:
            self.no_progress_steps = 0

        self.day += 1
        self.done = self.day >= self.cfg.horizon_days

        if self.done:
            reward = self._finalize_reward(reward)
            self.reward_history[-1] = reward.value

        info = {
            "arrivals": arrivals,
            "demand": demand,
            "fulfilled": fulfilled,
            "service_level": service_level,
            "step_profit": step_profit,
            "inventory_position": self.inventory + sum(s.quantity for s in self.pending_shipments) - self.backlog,
        }
        return self._observation(), reward, self.done, info

    def _process_shipments(self) -> int:
        arrivals = 0
        next_shipments: List[Shipment] = []
        for shipment in self.pending_shipments:
            eta = max(0, shipment.eta_days - 1)
            if eta == 0:
                self.inventory += shipment.quantity
                arrivals += shipment.quantity
            else:
                next_shipments.append(shipment.model_copy(update={"eta_days": eta}))
        self.pending_shipments = next_shipments
        return arrivals

    def _apply_action(self, action: Action) -> float:
        op_cost = 0.0
        if action.operation == "order" and action.quantity > 0:
            self._shipment_counter += 1
            lead_time = int(self.rng.integers(self.cfg.lead_time_min, self.cfg.lead_time_max + 1))
            if float(self.rng.random()) < self.cfg.disruption_probability:
                lead_time += self.cfg.disruption_delay
            self.pending_shipments.append(
                Shipment(
                    shipment_id=self._shipment_counter,
                    quantity=action.quantity,
                    eta_days=lead_time,
                    expedited=False,
                )
            )
            op_cost += self.cfg.fixed_order_cost + action.quantity * self.cfg.unit_order_cost

        if action.operation == "expedite" and action.target_shipment_id is not None:
            for idx, shipment in enumerate(self.pending_shipments):
                if shipment.shipment_id == action.target_shipment_id and shipment.eta_days > 1:
                    self.pending_shipments[idx] = shipment.model_copy(
                        update={"eta_days": shipment.eta_days - 1, "expedited": True}
                    )
                    op_cost += self.cfg.expedite_cost
                    break
        return op_cost

    def _sample_demand(self, day: int, discount_pct: float) -> int:
        base = self.cfg.demand_series[day]
        uplift = 1.0 + self.cfg.discount_sensitivity * discount_pct
        noise = float(self.rng.normal(0.0, 1.5 if self.task_id != "hard" else 2.5))
        return max(0, int(round(base * uplift + noise)))

    def _build_reward(
        self,
        step_profit: float,
        demand: int,
        fulfilled: int,
        prev_backlog: int,
        action: Action,
    ) -> Reward:
        total_requested = demand + prev_backlog
        service_term = min(1.0, fulfilled / max(1, total_requested))
        target = max(1, self.cfg.target_inventory)
        stock_term = max(0.0, 1.0 - abs(self.inventory - target) / target)
        profit_term = float(np.clip((step_profit + 450.0) / 900.0, 0.0, 1.0))
        backlog_term = 1.0 if self.backlog == 0 else max(0.0, 1.0 - self.backlog / 120.0)
        anti_loop_penalty = 0.12 if (self.no_progress_steps >= 2 and action.operation == "noop") else 0.0

        value = 0.42 * service_term + 0.22 * stock_term + 0.22 * profit_term + 0.14 * backlog_term
        value = float(np.clip(value - anti_loop_penalty, 0.0, 1.0))

        return Reward(
            value=value,
            components={
                "service": round(service_term, 4),
                "stock_health": round(stock_term, 4),
                "profit_quality": round(profit_term, 4),
                "backlog_control": round(backlog_term, 4),
                "anti_loop_penalty": round(anti_loop_penalty, 4),
            },
        )

    def _finalize_reward(self, reward: Reward) -> Reward:
        avg_service = float(np.mean(self.service_history)) if self.service_history else 0.0
        profit_goal = {"easy": 1300.0, "medium": 2100.0, "hard": 3000.0}[self.task_id]
        profit_term = float(np.clip(self.cumulative_profit / profit_goal, 0.0, 1.0))
        terminal_bonus = 0.12 * avg_service + 0.10 * profit_term
        final_value = float(np.clip(reward.value + terminal_bonus, 0.0, 1.0))
        parts = reward.components.copy()
        parts["terminal_bonus"] = round(terminal_bonus, 4)
        return Reward(value=final_value, components=parts)

    def _observation(self) -> Observation:
        forecast = []
        for delta in range(1, 4):
            idx = min(self.day + delta, self.cfg.horizon_days - 1)
            forecast.append(self.cfg.demand_series[idx])

        recent_service = self.service_history[-7:]
        service_level_7d = float(np.mean(recent_service)) if recent_service else 1.0
        guidance = (
            "Keep service high while controlling backlog and holding cost. "
            "Order proactively before spikes, expedite only when needed."
        )

        return Observation(
            task_id=self.task_id,  # type: ignore[arg-type]
            day=self.day,
            horizon_days=self.cfg.horizon_days,
            inventory=self.inventory,
            backlog=self.backlog,
            demand_today=self._last_demand,
            demand_forecast_3d=forecast,
            in_transit=list(self.pending_shipments),
            service_level_7d=service_level_7d,
            cumulative_profit=round(self.cumulative_profit, 2),
            guidance=guidance,
        )


class SupplyChainEnv(RetailSupplyChainEnv):
    """Backward-compatible alias for older scripts in this repository."""

    def __init__(self, difficulty: str = "medium", seed: int = 7):
        task_map = {"easy": "easy", "medium": "medium", "hard": "hard"}
        super().__init__(task_id=task_map.get(difficulty, "medium"), seed=seed)

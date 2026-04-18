from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np

from schema import Action, Observation, Reward, Shipment, State
from news_service import GlobalIntelService


@dataclass(frozen=True)
class TaskConfig:
    task_id: str
    description: str
    horizon_days: int
    initial_inventory_central: int
    initial_inventory_regional: int
    unit_price: float
    local_unit_cost: float
    overseas_unit_cost: float
    fixed_order_local: float
    fixed_order_overseas: float
    transfer_cost: float
    holding_cost_central: float
    holding_cost_regional: float
    backlog_cost: float
    expedite_cost: float
    local_lead_time_min: int
    local_lead_time_max: int
    overseas_lead_time_min: int
    overseas_lead_time_max: int
    transfer_lead_time: int
    weather_storm_prob: float
    weather_hurricane_prob: float
    fuel_volatility: float
    discount_sensitivity: float
    demand_series: List[int]
    target_inventory_regional: int


class RetailSupplyChainEnv:
    """
    Real-world simulation: multi-echelon single-SKU retail replenishment under
    uncertain demand, weather disruptions, and fuel volatility.
    The agent manages ordering to a central hub (from local/overseas),
    and transferring stock to the regional store where customer demand hits.
    """

    metadata = {"version": "3.0.0", "domain": "retail-demand-planning"}

    TASKS: Dict[str, TaskConfig] = {
        "easy": TaskConfig(
            task_id="easy",
            description="Stable weekday demand, short lead times. Slight fuel volatility.",
            horizon_days=14,
            initial_inventory_central=200,
            initial_inventory_regional=95,
            unit_price=24.0,
            local_unit_cost=10.0,
            overseas_unit_cost=6.0,
            fixed_order_local=20.0,
            fixed_order_overseas=40.0,
            transfer_cost=1.5,
            holding_cost_central=0.2,
            holding_cost_regional=0.6,
            backlog_cost=3.5,
            expedite_cost=18.0,
            local_lead_time_min=1,
            local_lead_time_max=2,
            overseas_lead_time_min=3,
            overseas_lead_time_max=5,
            transfer_lead_time=1,
            weather_storm_prob=0.05,
            weather_hurricane_prob=0.0,
            fuel_volatility=0.02,
            discount_sensitivity=0.30,
            demand_series=[18, 16, 17, 19, 20, 22, 21, 20, 19, 18, 17, 19, 20, 21],
            target_inventory_regional=85,
        ),
        "medium": TaskConfig(
            task_id="medium",
            description="Promotional demand spikes with occasional storms affecting overseas.",
            horizon_days=21,
            initial_inventory_central=250,
            initial_inventory_regional=130,
            unit_price=26.0,
            local_unit_cost=11.0,
            overseas_unit_cost=6.5,
            fixed_order_local=25.0,
            fixed_order_overseas=45.0,
            transfer_cost=2.0,
            holding_cost_central=0.3,
            holding_cost_regional=0.8,
            backlog_cost=4.3,
            expedite_cost=22.0,
            local_lead_time_min=1,
            local_lead_time_max=2,
            overseas_lead_time_min=4,
            overseas_lead_time_max=6,
            transfer_lead_time=1,
            weather_storm_prob=0.15,
            weather_hurricane_prob=0.02,
            fuel_volatility=0.04,
            discount_sensitivity=0.45,
            demand_series=[20, 21, 19, 24, 28, 34, 36, 29, 26, 24, 23, 22, 25, 27, 31, 35, 33, 28, 24, 22, 21],
            target_inventory_regional=120,
        ),
        "hard": TaskConfig(
            task_id="hard",
            description="Peak-season volatility, long lead times, hurricanes block overseas route.",
            horizon_days=28,
            initial_inventory_central=300,
            initial_inventory_regional=170,
            unit_price=27.0,
            local_unit_cost=12.0,
            overseas_unit_cost=7.0,
            fixed_order_local=30.0,
            fixed_order_overseas=50.0,
            transfer_cost=2.5,
            holding_cost_central=0.4,
            holding_cost_regional=1.0,
            backlog_cost=5.4,
            expedite_cost=30.0,
            local_lead_time_min=2,
            local_lead_time_max=3,
            overseas_lead_time_min=5,
            overseas_lead_time_max=8,
            transfer_lead_time=2,
            weather_storm_prob=0.25,
            weather_hurricane_prob=0.08,
            fuel_volatility=0.08,
            discount_sensitivity=0.55,
            demand_series=[26, 24, 27, 29, 32, 34, 38, 42, 46, 51, 49, 44, 41, 36, 33, 31, 34, 39, 45, 52, 56, 53, 47, 43, 39, 36, 34, 32],
            target_inventory_regional=150,
        ),
    }

    def __init__(self, task_id: str = "medium", seed: int = 7, use_live_intel: bool = True):
        if task_id not in self.TASKS:
            raise ValueError(f"Unknown task_id '{task_id}'. Expected one of {list(self.TASKS)}")
        self.task_id = task_id
        self.seed = seed
        self.use_live_intel = use_live_intel
        self.rng = np.random.default_rng(seed)
        self._shipment_counter = 0
        self.reset()

    def reset(self) -> Observation:
        self.cfg = self.TASKS[self.task_id]
        self.day = 0
        self.inventory_central = self.cfg.initial_inventory_central
        self.inventory_regional = self.cfg.initial_inventory_regional
        self.backlog = 0
        self.pending_shipments: List[Shipment] = []
        self.demand_history: List[int] = []
        self.service_history: List[float] = []
        self.reward_history: List[float] = []
        self.cumulative_profit = 0.0
        self.no_progress_steps = 0
        self.done = False
        self._last_demand = 0
        
        self.weather_condition = "clear"
        self.fuel_cost_multiplier = 1.0
        self.overseas_route_status = "open"
        
        # New SaaS Evolution Fields
        self.inventory_raw_material = 50 # Start with some raw materials
        self.shock_magnitude = 0.0
        self.geopolitical_event = "stable"

        return self._observation()

    def state(self) -> State:
        return State(
            task_id=self.task_id, # type: ignore
            day=self.day,
            inventory_central=self.inventory_central,
            inventory_regional=self.inventory_regional,
            inventory_raw_material=self.inventory_raw_material,
            weather_condition=self.weather_condition, # type: ignore
            fuel_cost_multiplier=self.fuel_cost_multiplier,
            shock_magnitude=self.shock_magnitude,
            geopolitical_event=self.geopolitical_event, # type: ignore
            overseas_route_status=self.overseas_route_status, # type: ignore
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

        # 1. Update Environment Factors (Fuel, Weather, Geopolitical)
        self._update_environmental_factors()
        self._update_geopolitical_factors()

        # 2. Process Arrivals
        arrivals = self._process_shipments()

        # 3. Apply Action
        op_cost = self._apply_action(action)

        # 4. Process Demand (hits regional store)
        demand = self._sample_demand(self.day, action.discount_pct)
        total_to_fill = demand + self.backlog
        fulfilled = min(self.inventory_regional, total_to_fill)
        self.inventory_regional -= fulfilled
        self.backlog = max(0, total_to_fill - fulfilled)

        served_today = min(fulfilled, demand)
        service_level = served_today / max(1, demand)
        self.service_history.append(service_level)
        self.demand_history.append(demand)
        self._last_demand = demand

        # 5. Financials
        revenue = served_today * self.cfg.unit_price * (1.0 - action.discount_pct)
        # fuel multiplier scales holding cost to represent elevated warehouse electricity/logistics bases
        holding_central = self.inventory_central * self.cfg.holding_cost_central * self.fuel_cost_multiplier
        holding_regional = self.inventory_regional * self.cfg.holding_cost_regional * self.fuel_cost_multiplier
        backlog_penalty = self.backlog * self.cfg.backlog_cost
        
        step_profit = revenue - op_cost - holding_central - holding_regional - backlog_penalty
        self.cumulative_profit += step_profit

        # 6. Rewards
        reward = self._build_reward(
            step_profit=step_profit,
            demand=demand,
            fulfilled=fulfilled,
            prev_backlog=prev_backlog,
            action=action,
        )
        self.reward_history.append(reward.value)

        # 7. Progress Tracking
        if self.backlog >= prev_backlog and action.operation in ["noop", "discount"]:
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
        }
        return self._observation(), reward, self.done, info

    def _update_environmental_factors(self) -> None:
        # Fuel Volatility Random Walk
        noise = float(self.rng.normal(0.0, self.cfg.fuel_volatility))
        self.fuel_cost_multiplier = float(np.clip(self.fuel_cost_multiplier + noise, 0.5, 2.5))
        
        # Weather Markov Process
        r = float(self.rng.random())
        if r < self.cfg.weather_hurricane_prob:
            self.weather_condition = "hurricane"
            self.overseas_route_status = "blocked"
        elif r < self.cfg.weather_hurricane_prob + self.cfg.weather_storm_prob:
            self.weather_condition = "storm"
            self.overseas_route_status = "delayed"
        else:
            self.weather_condition = "clear"
            self.overseas_route_status = "open"

    def _update_geopolitical_factors(self) -> None:
        if self.use_live_intel:
            intel = GlobalIntelService.fetch_current_shocks()
            self.geopolitical_event = intel["event"]
            self.shock_magnitude = intel["magnitude"]
            return

        # Geopolitical Tension (Markov-like fallback)
        r = float(self.rng.random())
        if r < 0.02:
            self.geopolitical_event = "trade_war"
            self.shock_magnitude = float(self.rng.uniform(0.7, 1.0))
        elif r < 0.05:
            self.geopolitical_event = "sanctions"
            self.shock_magnitude = float(self.rng.uniform(0.4, 0.7))
        elif r < 0.15:
            self.geopolitical_event = "unrest"
            self.shock_magnitude = float(self.rng.uniform(0.1, 0.4))
        else:
            # Gradually decay shock
            self.geopolitical_event = "stable"
            self.shock_magnitude = max(0.0, self.shock_magnitude - 0.05)

    def _process_shipments(self) -> Dict[str, int]:
        arrivals = {"central": 0, "regional": 0}
        next_shipments: List[Shipment] = []
        for shipment in self.pending_shipments:
            delay_applied = False
            # Apply weather effect to overseas shipments
            if shipment.source == "overseas":
                if self.overseas_route_status == "blocked":
                    # Fully blocked, do not progress
                    delay_applied = True
                elif self.overseas_route_status == "delayed":
                    # 50% chance to be delayed an extra day inside a storm
                    if float(self.rng.random()) < 0.5:
                        delay_applied = True

            eta = shipment.eta_days
            if not delay_applied:
                eta = max(0, shipment.eta_days - 1)
            
            if eta == 0:
                if shipment.destination == "factory" and shipment.material_type == "raw":
                    self.inventory_raw_material += shipment.quantity
                    arrivals["factory_raw"] = arrivals.get("factory_raw", 0) + shipment.quantity
                elif shipment.destination == "central":
                    self.inventory_central += shipment.quantity
                    arrivals["central"] += shipment.quantity
                elif shipment.destination == "regional":
                    self.inventory_regional += shipment.quantity
                    arrivals["regional"] += shipment.quantity
            else:
                next_shipments.append(shipment.model_copy(update={"eta_days": eta}))
                
        self.pending_shipments = next_shipments
        return arrivals

    def _apply_action(self, action: Action) -> float:
        op_cost = 0.0
        
        if action.operation == "order" and action.quantity > 0:
            self._shipment_counter += 1
            if action.supplier == "overseas":
                lead_time = int(self.rng.integers(self.cfg.overseas_lead_time_min, self.cfg.overseas_lead_time_max + 1))
                unit_cost = self.cfg.overseas_unit_cost
                fixed_cost = self.cfg.fixed_order_overseas
            else:
                lead_time = int(self.rng.integers(self.cfg.local_lead_time_min, self.cfg.local_lead_time_max + 1))
                unit_cost = self.cfg.local_unit_cost
                fixed_cost = self.cfg.fixed_order_local
            
            self.pending_shipments.append(
                Shipment(
                    shipment_id=self._shipment_counter,
                    quantity=action.quantity,
                    eta_days=lead_time,
                    expedited=False,
                    source=action.supplier,
                    destination="central"
                )
            )
            base_cost = fixed_cost + action.quantity * unit_cost
            op_cost += base_cost * self.fuel_cost_multiplier * (1.0 + self.shock_magnitude * 0.5)
            
        if action.operation == "procurre_raw" and action.quantity > 0:
            self._shipment_counter += 1
            # Raw materials have higher lead time variability under geopolitical shocks
            base_lead = 3
            shock_delay = int(self.shock_magnitude * 5)
            lead_time = base_lead + shock_delay + int(self.rng.integers(0, 3))
            
            self.pending_shipments.append(
                Shipment(
                    shipment_id=self._shipment_counter,
                    quantity=action.quantity,
                    eta_days=lead_time,
                    source="raw_vendor",
                    destination="factory",
                    material_type="raw"
                )
            )
            # Procurement cost scales with shock
            unit_cost = 4.0 * (1.0 + self.shock_magnitude)
            op_cost += (10.0 + action.quantity * unit_cost) * self.fuel_cost_multiplier

        if action.operation == "manufacture" and action.quantity > 0:
            qty_to_make = min(self.inventory_raw_material, action.quantity)
            if qty_to_make > 0:
                self.inventory_raw_material -= qty_to_make
                self._shipment_counter += 1
                # Production pipeline
                lead_time = 2 + int(self.shock_magnitude * 2) # Factory disruptions
                self.pending_shipments.append(
                    Shipment(
                        shipment_id=self._shipment_counter,
                        quantity=qty_to_make,
                        eta_days=lead_time,
                        source="local", # Producer is local
                        destination="central",
                        material_type="finished"
                    )
                )
                op_cost += qty_to_make * 2.0 * self.fuel_cost_multiplier

        if action.operation == "transfer" and action.quantity > 0:
            qty_to_transfer = min(self.inventory_central, action.quantity)
            if qty_to_transfer > 0:
                self.inventory_central -= qty_to_transfer
                self._shipment_counter += 1
                lead_time = self.cfg.transfer_lead_time
                self.pending_shipments.append(
                    Shipment(
                        shipment_id=self._shipment_counter,
                        quantity=qty_to_transfer,
                        eta_days=lead_time,
                        expedited=False,
                        source="central_hub",
                        destination="regional"
                    )
                )
                base_cost = qty_to_transfer * self.cfg.transfer_cost
                op_cost += base_cost * self.fuel_cost_multiplier

        if action.operation == "expedite" and action.target_shipment_id is not None:
            for idx, shipment in enumerate(self.pending_shipments):
                if shipment.shipment_id == action.target_shipment_id and shipment.eta_days > 1:
                    # You cannot easily expedite an overseas shipment stuck in a hurricane
                    if shipment.source == "overseas" and self.overseas_route_status == "blocked":
                        continue # Failed to expedite

                    self.pending_shipments[idx] = shipment.model_copy(
                        update={"eta_days": shipment.eta_days - 1, "expedited": True}
                    )
                    op_cost += self.cfg.expedite_cost * self.fuel_cost_multiplier
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
        target = max(1, self.cfg.target_inventory_regional)
        stock_term = max(0.0, 1.0 - abs(self.inventory_regional - target) / target)
        profit_term = float(np.clip((step_profit + 450.0) / 900.0, 0.0, 1.0))
        backlog_term = 1.0 if self.backlog == 0 else max(0.0, 1.0 - self.backlog / 120.0)
        anti_loop_penalty = 0.12 if (self.no_progress_steps >= 2 and action.operation in ["noop", "discount"]) else 0.0

        value = 0.40 * service_term + 0.18 * stock_term + 0.18 * profit_term + 0.12 * backlog_term
        
        # New: Shock Resilience Bonus
        # Reward for having raw materials available when shock magnitude is high
        resilience_bonus = 0.0
        if self.shock_magnitude > 0.4:
            resilience_bonus = 0.12 if self.inventory_raw_material > 20 else -0.05
            
        value = float(np.clip(value - anti_loop_penalty + resilience_bonus, 0.0, 1.0))

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
            "Keep regional inventory high while controlling backlog and central holding costs. "
            "Use overseas routes for cheap supply unless weather/fuel dictates otherwise. "
            "Transfer stock to regional ahead of demand spikes."
        )

        return Observation(
            task_id=self.task_id,  # type: ignore
            day=self.day,
            horizon_days=self.cfg.horizon_days,
            inventory_central=self.inventory_central,
            inventory_regional=self.inventory_regional,
            inventory_raw_material=self.inventory_raw_material,
            weather_condition=self.weather_condition, # type: ignore
            fuel_cost_multiplier=round(self.fuel_cost_multiplier, 2),
            shock_magnitude=round(self.shock_magnitude, 2),
            geopolitical_event=self.geopolitical_event, # type: ignore
            overseas_route_status=self.overseas_route_status, # type: ignore
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

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class Shipment(BaseModel):
    shipment_id: int
    quantity: int = Field(ge=0)
    eta_days: int = Field(ge=0)
    expedited: bool = False
    source: Literal["local", "overseas", "central_hub"]
    destination: Literal["central", "regional"]


class Action(BaseModel):
    operation: Literal["noop", "order", "transfer", "expedite", "discount"] = "noop"
    quantity: int = Field(default=0, ge=0, le=500)
    supplier: Literal["local", "overseas"] = "overseas"
    target_shipment_id: Optional[int] = None
    discount_pct: float = Field(default=0.0, ge=0.0, le=0.5)
    rationale: str = ""

    @model_validator(mode="before")
    @classmethod
    def _normalize_legacy_amount(cls, data: Any) -> Any:
        if isinstance(data, dict) and "amount" in data and "quantity" not in data:
            data = dict(data)
            data["quantity"] = data["amount"]
            if data.get("operation") is None:
                data["operation"] = "order" if int(data["amount"]) > 0 else "noop"
        return data


class Observation(BaseModel):
    task_id: Literal["easy", "medium", "hard"]
    day: int = Field(ge=0)
    horizon_days: int = Field(ge=1)
    inventory_central: int
    inventory_regional: int
    weather_condition: Literal["clear", "storm", "hurricane"]
    fuel_cost_multiplier: float
    overseas_route_status: Literal["open", "delayed", "blocked"]
    backlog: int = Field(ge=0)
    demand_today: int = Field(ge=0)
    demand_forecast_3d: List[int]
    in_transit: List[Shipment]
    service_level_7d: float = Field(ge=0.0, le=1.0)
    cumulative_profit: float
    guidance: str


class Reward(BaseModel):
    value: float = Field(ge=0.0, le=1.0)
    components: Dict[str, float]


class State(BaseModel):
    task_id: Literal["easy", "medium", "hard"]
    day: int
    inventory_central: int
    inventory_regional: int
    weather_condition: Literal["clear", "storm", "hurricane"]
    fuel_cost_multiplier: float
    overseas_route_status: Literal["open", "delayed", "blocked"]
    backlog: int
    pending_shipments: List[Shipment]
    demand_history: List[int]
    reward_history: List[float]
    cumulative_profit: float
    no_progress_steps: int
    done: bool
    config: Dict[str, Any]


class StepResult(BaseModel):
    observation: Observation
    reward: Reward
    done: bool
    info: Dict[str, Any]

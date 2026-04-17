from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str = "general"
    description: Optional[str] = None
    unit_price: float = Field(default=25.0, ge=0)
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = Field(default=None, ge=0)
    active: Optional[bool] = None


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SupplierBase(BaseModel):
    name: str
    supplier_type: Literal["local", "overseas"]
    lead_time_days: int = Field(default=2, ge=1)
    unit_cost: float = Field(default=10.0, ge=0)
    reliability_score: float = Field(default=0.95, ge=0, le=1)
    active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    supplier_type: Optional[Literal["local", "overseas"]] = None
    lead_time_days: Optional[int] = Field(default=None, ge=1)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    reliability_score: Optional[float] = Field(default=None, ge=0, le=1)
    active: Optional[bool] = None


class SupplierRead(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryBase(BaseModel):
    product_id: int
    location_type: Literal["central", "regional"]
    location_name: str
    on_hand: int = Field(default=0, ge=0)
    backlog: int = Field(default=0, ge=0)
    in_transit: int = Field(default=0, ge=0)
    reorder_point: int = Field(default=50, ge=0)
    safety_stock: int = Field(default=25, ge=0)


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    product_id: Optional[int] = None
    location_type: Optional[Literal["central", "regional"]] = None
    location_name: Optional[str] = None
    on_hand: Optional[int] = Field(default=None, ge=0)
    backlog: Optional[int] = Field(default=None, ge=0)
    in_transit: Optional[int] = Field(default=None, ge=0)
    reorder_point: Optional[int] = Field(default=None, ge=0)
    safety_stock: Optional[int] = Field(default=None, ge=0)


class InventoryRead(InventoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderBase(BaseModel):
    product_id: int
    supplier_id: Optional[int] = None
    order_type: Literal["order", "transfer", "expedite", "discount"] = "order"
    status: Literal["planned", "in_transit", "delivered", "cancelled"] = "planned"
    quantity: int = Field(default=0, ge=0)
    unit_cost: float = Field(default=0.0, ge=0)
    source_location: str = "supplier"
    destination_location: str = "central"
    expected_arrival: Optional[datetime] = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    product_id: Optional[int] = None
    supplier_id: Optional[int] = None
    order_type: Optional[Literal["order", "transfer", "expedite", "discount"]] = None
    status: Optional[Literal["planned", "in_transit", "delivered", "cancelled"]] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    source_location: Optional[str] = None
    destination_location: Optional[str] = None
    expected_arrival: Optional[datetime] = None


class OrderRead(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransitShipment(BaseModel):
    quantity: int = Field(default=0, ge=0)
    eta_days: int = Field(default=0, ge=0)
    source: Literal["local", "overseas", "central_hub"] = "overseas"
    destination: Literal["central", "regional"] = "central"
    expedited: bool = False


class SystemState(BaseModel):
    task_id: Literal["easy", "medium", "hard"] = "medium"
    central_inventory: int = Field(default=250, ge=0)
    regional_inventory: int = Field(default=130, ge=0)
    backlog: int = Field(default=0, ge=0)
    in_transit_central: int = Field(default=0, ge=0)
    in_transit_regional: int = Field(default=0, ge=0)
    demand_forecast_3d: list[int] = Field(default_factory=lambda: [24, 26, 28], min_length=3, max_length=3)
    weather_condition: Literal["clear", "storm", "hurricane"] = "clear"
    overseas_route_status: Literal["open", "delayed", "blocked"] = "open"
    fuel_cost_multiplier: float = Field(default=1.0, ge=0.5, le=3.5)
    pending_shipments: list[TransitShipment] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    state: SystemState


class RecommendationResponse(BaseModel):
    action_type: Literal["noop", "order", "transfer", "expedite", "discount"]
    quantity: int = Field(ge=0)
    supplier: Literal["local", "overseas"]
    confidence_score: float = Field(ge=0, le=1)
    expected_reward: float
    reasoning: str


class ManualAction(BaseModel):
    step_index: int = Field(ge=0)
    action_type: Literal["noop", "order", "transfer", "expedite", "discount"] = "noop"
    quantity: int = Field(default=0, ge=0)
    supplier: Literal["local", "overseas"] = "overseas"
    target_shipment_id: Optional[int] = None
    discount_pct: float = Field(default=0.0, ge=0, le=0.5)


class ScenarioConfig(BaseModel):
    demand_multiplier: float = Field(default=1.0, ge=0.2, le=5.0)
    fuel_multiplier: Optional[float] = Field(default=None, ge=0.5, le=3.5)
    weather_condition: Optional[Literal["clear", "storm", "hurricane"]] = None
    route_status: Optional[Literal["open", "delayed", "blocked"]] = None


class SimulationRequest(BaseModel):
    name: str = "Scenario Run"
    initial_state: SystemState
    steps: int = Field(default=14, ge=1, le=90)
    policy: Literal["rl", "manual", "baseline"] = "rl"
    manual_actions: list[ManualAction] = Field(default_factory=list)
    scenario: ScenarioConfig = Field(default_factory=ScenarioConfig)


class TrajectoryStep(BaseModel):
    step_index: int
    state: dict
    action: dict
    reward: float
    expected_reward: float
    confidence_score: float
    reasoning: str
    info: dict


class SimulationKPIs(BaseModel):
    total_profit: float
    service_level: float
    backlog: int
    average_reward: float


class SimulationResponse(BaseModel):
    run_id: int
    policy: str
    trajectory: list[TrajectoryStep]
    final_kpis: SimulationKPIs


class PolicyComparisonRequest(BaseModel):
    initial_state: SystemState
    steps: int = Field(default=14, ge=1, le=90)
    scenario: ScenarioConfig = Field(default_factory=ScenarioConfig)


class PolicyOutcome(BaseModel):
    policy: str
    total_profit: float
    service_level: float
    backlog: int


class PolicyComparisonResponse(BaseModel):
    rl: PolicyOutcome
    baseline: PolicyOutcome


class AnalyticsSeriesPoint(BaseModel):
    label: str
    value: float


class AnalyticsSummary(BaseModel):
    total_runs: int
    avg_profit: float
    avg_service_level: float
    avg_backlog: float


class PerformanceScore(BaseModel):
    task_id: Literal["easy", "medium", "hard"]
    score: float = Field(ge=0, le=100)

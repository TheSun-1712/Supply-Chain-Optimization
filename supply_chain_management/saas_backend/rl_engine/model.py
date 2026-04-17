from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import torch
import torch.nn as nn

from ..core.config import settings
from ..schemas.domain import RecommendationResponse, SystemState


ACTION_MAP = ["noop", "order", "transfer", "expedite", "discount"]
SUPPLIER_MAP = ["local", "overseas"]
WEATHER_MAP = {"clear": 0.0, "storm": 1.0, "hurricane": 2.0}
ROUTE_MAP = {"open": 0.0, "delayed": 1.0, "blocked": 2.0}


class HybridSupplyChainNet(nn.Module):
    def __init__(self, input_dim: int = 11):
        super().__init__()
        self.fc_shared = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
        )
        self.head_q_values = nn.Linear(64, 5)
        self.head_quantity = nn.Sequential(nn.Linear(64, 1), nn.Sigmoid())
        self.head_supplier = nn.Linear(64, 2)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        features = self.fc_shared(x)
        return self.head_q_values(features), self.head_quantity(features), self.head_supplier(features)


@dataclass
class EnginePrediction:
    action_type: str
    quantity: int
    supplier: str
    confidence_score: float
    expected_reward: float
    reasoning: str
    discount_pct: float


class RLEngine:
    def __init__(self, model_path: str | None = None):
        self.device = torch.device("cpu")
        self.model = HybridSupplyChainNet().to(self.device)
        chosen_path = Path(model_path or settings.model_path)
        if not chosen_path.exists():
            raise FileNotFoundError(f"RL model weights not found at {chosen_path}")
        state_dict = torch.load(chosen_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def _encode(self, state: SystemState) -> torch.Tensor:
        features = [
            state.central_inventory / 1000.0,
            state.regional_inventory / 500.0,
            state.backlog / 100.0,
            state.in_transit_central / 1000.0,
            state.in_transit_regional / 500.0,
            state.demand_forecast_3d[0] / 100.0,
            state.demand_forecast_3d[1] / 100.0,
            state.demand_forecast_3d[2] / 100.0,
            WEATHER_MAP[state.weather_condition] / 2.0,
            ROUTE_MAP[state.overseas_route_status] / 2.0,
            state.fuel_cost_multiplier / 3.5,
        ]
        return torch.tensor(features, dtype=torch.float32, device=self.device).unsqueeze(0)

    def _reason(self, state: SystemState, action_type: str, supplier: str) -> str:
        reasons: list[str] = []
        if state.backlog > 20:
            reasons.append("backlog is elevated")
        if sum(state.demand_forecast_3d) / 3 >= 30:
            reasons.append("near-term demand is rising")
        if state.regional_inventory < max(40, state.demand_forecast_3d[0]):
            reasons.append("regional inventory is tight")
        if state.weather_condition != "clear" or state.overseas_route_status != "open":
            reasons.append("disruption risk is active")
        if state.fuel_cost_multiplier > 1.4:
            reasons.append("logistics costs are inflated")
        if action_type == "order" and supplier == "overseas" and state.overseas_route_status == "open":
            reasons.append("overseas supply keeps unit cost lower")
        if action_type == "transfer":
            reasons.append("rebalancing central stock improves service level")
        if action_type == "expedite":
            reasons.append("faster receipt helps protect fill rate")
        if action_type == "discount":
            reasons.append("demand shaping helps reduce overstock risk")
        if not reasons:
            reasons.append("system is balanced, so the policy prefers a conservative move")
        return " + ".join(reasons[:3]).capitalize()

    def recommend(self, state: SystemState) -> EnginePrediction:
        with torch.no_grad():
            encoded = self._encode(state)
            q_values, qty_pred, supplier_logits = self.model(encoded)
            q_probs = torch.softmax(q_values, dim=-1).squeeze(0)
            sup_probs = torch.softmax(supplier_logits, dim=-1).squeeze(0)

        action_idx = int(torch.argmax(q_values, dim=-1).item())
        supplier_idx = int(torch.argmax(supplier_logits, dim=-1).item())
        action_type = ACTION_MAP[action_idx]
        supplier = SUPPLIER_MAP[supplier_idx]
        quantity = int(round(float(qty_pred.squeeze(0).item()) * 500))
        if action_type in {"noop", "expedite"}:
            quantity = 0
        confidence_score = float(q_probs[action_idx].item())
        expected_reward = float(q_values.squeeze(0)[action_idx].item())
        discount_pct = round(min(0.5, quantity / 1000.0), 2)
        reasoning = self._reason(state, action_type, supplier)
        return EnginePrediction(
            action_type=action_type,
            quantity=quantity,
            supplier=supplier,
            confidence_score=confidence_score,
            expected_reward=expected_reward,
            reasoning=reasoning,
            discount_pct=discount_pct,
        )

    def recommend_response(self, state: SystemState) -> RecommendationResponse:
        pred = self.recommend(state)
        return RecommendationResponse(
            action_type=pred.action_type,
            quantity=pred.quantity,
            supplier=pred.supplier,
            confidence_score=pred.confidence_score,
            expected_reward=pred.expected_reward,
            reasoning=pred.reasoning,
        )

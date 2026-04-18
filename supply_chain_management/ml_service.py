import os
import torch
from schema import Action, Observation
from math_agent import MultiEchelonBaseStockAgent
from train_rl import SupplyChainAgentNN

MODEL_PATH = "rl_behavioral_clone.pth"
OPTIMIZED_PATH = "rl_agent_optimized.pt"

# Load Model
model = None
try:
    if os.path.exists(OPTIMIZED_PATH):
        # Load high-performance TorchScript model
        model = torch.jit.load(OPTIMIZED_PATH)
        model.eval()
        print(f"✅ Successfully loaded OPTIMIZED RL Model from {OPTIMIZED_PATH}")
    elif os.path.exists(MODEL_PATH):
        model = SupplyChainAgentNN(input_dim=15)
        model.load_state_dict(torch.load(MODEL_PATH))
        model.eval()
        print(f"✅ Loaded standard RL Model from {MODEL_PATH}")
    else:
        print(f"⚠️ No model file found. Will fallback to Math Agent.")
except Exception as e:
    print(f"❌ Error loading RL model: {e}. Will fallback to Math Agent.")


def get_model_status():
    return {
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "input_dim": 15,
        "output_heads": ["operation", "quantity", "supplier"]
    }

weather_map = {"clear": 0.0, "storm": 1.0, "hurricane": 2.0}
route_map = {"open": 0.0, "delayed": 1.0, "blocked": 2.0}
geo_map = {"stable": 0.0, "unrest": 1.0, "sanctions": 2.0, "trade_war": 3.0}
op_unmap = {0: "noop", 1: "order", 2: "transfer", 3: "expedite", 4: "discount", 5: "procurre_raw", 6: "manufacture"}
supplier_unmap = {0: "local", 1: "overseas", 2: "raw_vendor"}

def predict(obs: Observation, task_id: str) -> Action:
    if model is None:
        agent = MultiEchelonBaseStockAgent()
        action = agent(obs, task_id)
        action.rationale = "[Math Agent Fallback] " + action.rationale
        return action

    # 1. Flatten observation
    transit_c = sum(s.quantity for s in obs.in_transit if s.destination == "central")
    transit_r = sum(s.quantity for s in obs.in_transit if s.destination == "regional")
    transit_raw = sum(s.quantity for s in obs.in_transit if s.destination == "factory")
    
    forecast = obs.demand_forecast_3d
    f1, f2, f3 = forecast[0] if len(forecast)>0 else 0, forecast[1] if len(forecast)>1 else 0, forecast[2] if len(forecast)>2 else 0

    features = [
        obs.inventory_central / 1000.0,
        obs.inventory_regional / 500.0,
        obs.inventory_raw_material / 500.0,
        obs.backlog / 100.0,
        transit_c / 1000.0,
        transit_r / 500.0,
        transit_raw / 500.0,
        f1 / 100.0, f2 / 100.0, f3 / 100.0,
        weather_map.get(obs.weather_condition, 0.0) / 2.0,
        route_map.get(obs.overseas_route_status, 0.0) / 2.0,
        geo_map.get(obs.geopolitical_event, 0.0) / 3.0,
        obs.fuel_cost_multiplier / 3.5,
        obs.shock_magnitude,
    ]
    
    state_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    
    # 2. Inference
    with torch.no_grad():
        op_logits, qty_pred, sup_logits = model(state_tensor)
        
    op_idx = torch.argmax(op_logits, dim=1).item()
    sup_idx = torch.argmax(sup_logits, dim=1).item()
    qty = int(qty_pred.item() * 1000.0)
    
    operation = op_unmap.get(op_idx, "noop")
    supplier = supplier_unmap.get(sup_idx, "local")
    
    # Sanity checks based on operations
    if operation in ["noop", "discount"]:
        qty = 0
    if operation == "discount":
        discount_pct = 0.15
    else:
        discount_pct = 0.0
        
    target_shipment_id = None
    if operation == "expedite" and obs.in_transit:
        soonest = min((s for s in obs.in_transit if s.eta_days > 1), key=lambda x: x.eta_days, default=None)
        if soonest:
            target_shipment_id = soonest.shipment_id
        else:
            operation = "noop" # downgrade to noop if nothing to expedite

    return Action(
        operation=operation,
        quantity=qty,
        supplier=supplier,
        target_shipment_id=target_shipment_id,
        discount_pct=discount_pct,
        rationale="[Neural Network] AI analyzed complex state variables to generate optimal policy."
    )

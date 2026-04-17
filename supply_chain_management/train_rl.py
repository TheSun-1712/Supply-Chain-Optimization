import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
from database import SessionLocal, RLTrajectory

# ---------------------------------------------------------
# 1. DATA PROCESSING
# ---------------------------------------------------------
class SupplyChainDataset(Dataset):
    def __init__(self):
        with SessionLocal() as db:
            self.records = db.query(RLTrajectory).all()
            
        print(f"Loaded {len(self.records)} transitions from Database.")
            
        self.weather_map = {"clear": 0.0, "storm": 1.0, "hurricane": 2.0}
        self.route_map = {"open": 0.0, "delayed": 1.0, "blocked": 2.0}
        self.op_map = {"noop": 0, "order": 1, "transfer": 2, "expedite": 3, "discount": 4}
        self.supplier_map = {"local": 0, "overseas": 1}

    def __len__(self):
        return len(self.records)

    def _flatten_state(self, obs: dict) -> torch.Tensor:
        # Sum up pending shipments
        transit_c = sum(s.get("quantity", 0) for s in obs.get("in_transit", []) if s.get("destination") == "central")
        transit_r = sum(s.get("quantity", 0) for s in obs.get("in_transit", []) if s.get("destination") == "regional")
        
        forecast = obs.get("demand_forecast_3d", [0,0,0])
        f1, f2, f3 = forecast[0] if len(forecast)>0 else 0, forecast[1] if len(forecast)>1 else 0, forecast[2] if len(forecast)>2 else 0
        
        features = [
            obs.get("inventory_central", 0) / 1000.0, # Normalization bounds
            obs.get("inventory_regional", 0) / 500.0,
            obs.get("backlog", 0) / 100.0,
            transit_c / 1000.0,
            transit_r / 500.0,
            f1 / 100.0, f2 / 100.0, f3 / 100.0,
            self.weather_map.get(obs.get("weather_condition", "clear"), 0.0) / 2.0,
            self.route_map.get(obs.get("overseas_route_status", "open"), 0.0) / 2.0,
            obs.get("fuel_cost_multiplier", 1.0) / 3.5,
        ]
        return torch.tensor(features, dtype=torch.float32)

    def __getitem__(self, idx):
        record = self.records[idx]
        obs = json.loads(record.observation_state_json)
        action = json.loads(record.action_taken_json)
        
        # X 
        state_tensor = self._flatten_state(obs)
        
        # Y (Op Class, Qty, Supplier Class)
        op_idx = self.op_map.get(action.get("operation", "noop"), 0)
        qty = action.get("quantity") or 0.0
        norm_qty = qty / 1000.0  # normalize
        sup_idx = self.supplier_map.get(action.get("supplier", "local"), 0)
        
        return state_tensor, torch.tensor(op_idx, dtype=torch.long), torch.tensor([norm_qty], dtype=torch.float32), torch.tensor(sup_idx, dtype=torch.long)

# ---------------------------------------------------------
# 2. NEURAL NETWORK ARCHITECTURE
# ---------------------------------------------------------
class SupplyChainAgentNN(nn.Module):
    def __init__(self, input_dim=11):
        super().__init__()
        self.fc_shared = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
        )
        # Branches
        self.head_operation = nn.Linear(64, 5) # 5 possible op choices
        self.head_quantity = nn.Sequential(
            nn.Linear(64, 1),
            nn.Sigmoid() # Scale 0 to 1
        )
        self.head_supplier = nn.Linear(64, 2) # Local vs Overseas logits

    def forward(self, x):
        features = self.fc_shared(x)
        op_logits = self.head_operation(features)
        qty_pred = self.head_quantity(features)
        sup_logits = self.head_supplier(features)
        return op_logits, qty_pred, sup_logits

# ---------------------------------------------------------
# 3. BEHAVIORAL CLONING TRAINING LOOP
# ---------------------------------------------------------
def train_behavioral_cloning(epochs=50, batch_size=32, lr=1e-3):
    dataset = SupplyChainDataset()
    if len(dataset) < 10:
        print("Not enough data in DB. Run the Streamlit simulation to generate trajectory logs first!")
        return

    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = SupplyChainAgentNN(input_dim=11)
    
    # Loss functions
    criterion_op = nn.CrossEntropyLoss()
    criterion_qty = nn.MSELoss()
    criterion_sup = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    history_loss = []
    
    print("\nStarting Training...")
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        for states, op_targets, qty_targets, sup_targets in dataloader:
            optimizer.zero_grad()
            
            # Forward
            op_logits, qty_preds, sup_logits = model(states)
            
            # Multi-Task Loss formulation
            loss_op = criterion_op(op_logits, op_targets)
            loss_qty = criterion_qty(qty_preds, qty_targets)
            loss_sup = criterion_sup(sup_logits, sup_targets)
            
            # Combine losses
            total_loss = loss_op + (2.0 * loss_qty) + loss_sup
            
            # Backward
            total_loss.backward()
            optimizer.step()
            
            epoch_loss += total_loss.item()
            
        avg_loss = epoch_loss / len(dataloader)
        history_loss.append(avg_loss)
        
        if (epoch+1) % 10 == 0 or epoch == 0:
            print(f"Epoch [{epoch+1}/{epochs}] - Total MSE/CE Loss: {avg_loss:.4f}")

    print("Training Complete. Saving PyTorch blueprint...")
    torch.save(model.state_dict(), "rl_behavioral_clone.pth")
    
    # Plotting
    plt.figure(figsize=(10, 5))
    plt.plot(history_loss, label="Multi-Task Loss (Op + Qty + Sup)", color="purple", linewidth=2)
    plt.title("Behavioral Cloning Loss over Epochs")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.grid(True)
    plt.legend()
    plt.savefig("loss_curve.png")
    plt.show()

if __name__ == "__main__":
    train_behavioral_cloning(epochs=100)

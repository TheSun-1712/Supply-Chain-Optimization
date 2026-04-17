import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
import copy
import numpy as np
from database import SessionLocal, RLTrajectory

# ---------------------------------------------------------
# 1. DATA PROCESSING (Bellman Tuple + Z-Score Normalization)
# ---------------------------------------------------------
class SupplyChainDataset(Dataset):
    def __init__(self):
        with SessionLocal() as db:
            self.records = db.query(RLTrajectory).all()
            
        print(f"Loaded {len(self.records)} Bellman transitions from Database.")
        
        # Calculate Reward Statistics for Z-Score Normalization
        all_profits = [r.step_profit for r in self.records]
        self.reward_mean = np.mean(all_profits)
        self.reward_std = np.std(all_profits) if np.std(all_profits) > 0 else 1.0
        
        print(f"Reward Stats -> Mean: {self.reward_mean:.2f}, Std: {self.reward_std:.2f}")
            
        self.weather_map = {"clear": 0.0, "storm": 1.0, "hurricane": 2.0}
        self.route_map = {"open": 0.0, "delayed": 1.0, "blocked": 2.0}
        self.op_map = {"noop": 0, "order": 1, "transfer": 2, "expedite": 3, "discount": 4}
        self.supplier_map = {"local": 0, "overseas": 1}

    def __len__(self):
        return len(self.records)

    def _flatten_state(self, obs: dict) -> torch.Tensor:
        transit_c = sum(s.get("quantity", 0) for s in obs.get("in_transit", []) if s.get("destination") == "central")
        transit_r = sum(s.get("quantity", 0) for s in obs.get("in_transit", []) if s.get("destination") == "regional")
        
        forecast = obs.get("demand_forecast_3d", [0,0,0])
        f1, f2, f3 = forecast[0] if len(forecast)>0 else 0, forecast[1] if len(forecast)>1 else 0, forecast[2] if len(forecast)>2 else 0
        
        features = [
            obs.get("inventory_central", 0) / 1000.0,
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
        next_obs = json.loads(record.next_state_json)
        action = json.loads(record.action_taken_json)
        
        state_tensor = self._flatten_state(obs)
        next_state_tensor = self._flatten_state(next_obs)
        
        op_idx = self.op_map.get(action.get("operation", "noop"), 0)
        norm_qty = (action.get("quantity") or 0.0) / 1000.0
        sup_idx = self.supplier_map.get(action.get("supplier", "local"), 0)
        
        # Z-Score Normalization for Reward Stability
        reward_norm = (record.step_profit - self.reward_mean) / self.reward_std
        is_done = 1.0 if record.is_done else 0.0
        
        return state_tensor, torch.tensor(op_idx, dtype=torch.long), torch.tensor([norm_qty], dtype=torch.float32), torch.tensor(sup_idx, dtype=torch.long), torch.tensor([reward_norm], dtype=torch.float32), next_state_tensor, torch.tensor([is_done], dtype=torch.float32)

# ---------------------------------------------------------
# 2. NEURAL NETWORK ARCHITECTURE
# ---------------------------------------------------------
class SupplyChainAgentNN(nn.Module):
    def __init__(self, input_dim=11):
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
        self.head_quantity = nn.Sequential(
            nn.Linear(64, 1),
            nn.Sigmoid() 
        )
        self.head_supplier = nn.Linear(64, 2) 

    def forward(self, x):
        features = self.fc_shared(x)
        q_values = self.head_q_values(features)
        qty_pred = self.head_quantity(features)
        sup_logits = self.head_supplier(features)
        return q_values, qty_pred, sup_logits

# ---------------------------------------------------------
# 3. OPTIMIZED OFFLINE CQL TRAINING LOOP
# ---------------------------------------------------------
def train_hybrid_dqn(epochs=100, batch_size=128, lr=1e-4, gamma=0.99, target_update_freq=5, cql_alpha=1.0):
    dataset = SupplyChainDataset()
    if len(dataset) < 100:
        print("Not enough data. Please generate more DB transitions!")
        return

    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    policy_net = SupplyChainAgentNN(input_dim=11)
    target_net = copy.deepcopy(policy_net)
    target_net.eval()
    
    criterion_q = nn.HuberLoss() # Smoother than MSE for stability
    criterion_qty = nn.MSELoss()
    criterion_sup = nn.CrossEntropyLoss()
    
    optimizer = optim.Adam(policy_net.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=40, gamma=0.1)

    history_total_loss = []
    history_td_error = []
    history_cql_penalty = []
    
    print("\nStarting Optimized Conservative Q-Learning (CQL) Training...")
    
    for epoch in range(epochs):
        epoch_total_loss = 0.0
        epoch_td_error = 0.0
        epoch_cql_penalty = 0.0
        
        for states, op_targets, qty_targets, sup_targets, rewards, next_states, is_dones in dataloader:
            optimizer.zero_grad()
            
            # Predict current Q-Values
            current_q_values, qty_preds, sup_logits = policy_net(states)
            action_q_values = current_q_values.gather(1, op_targets.unsqueeze(1))
            
            with torch.no_grad():
                next_q_values, _, _ = target_net(next_states)
                max_next_q = next_q_values.max(1, keepdim=True)[0]
                expected_q_values = rewards + (gamma * max_next_q * (1.0 - is_dones))
            
            # 1. Temporal Difference (TD) Loss
            loss_td = criterion_q(action_q_values, expected_q_values)
            
            # 2. CQL Pessimism Penalty
            cql_logsumexp = torch.logsumexp(current_q_values, dim=1, keepdim=True)
            loss_cql_penalty = (cql_logsumexp - action_q_values).mean()
            
            # 3. Supervised Execution Loss
            loss_qty = criterion_qty(qty_preds, qty_targets)
            loss_sup = criterion_sup(sup_logits, sup_targets)
            
            # Total Loss Formulation
            total_loss = loss_td + (cql_alpha * loss_cql_penalty) + loss_qty + loss_sup
            
            total_loss.backward()
            
            # 4. Gradient Clipping
            torch.nn.utils.clip_grad_norm_(policy_net.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            epoch_total_loss += total_loss.item()
            epoch_td_error += loss_td.item()
            epoch_cql_penalty += loss_cql_penalty.item()
            
        scheduler.step()
        
        avg_total = epoch_total_loss / len(dataloader)
        avg_td = epoch_td_error / len(dataloader)
        avg_cql = epoch_cql_penalty / len(dataloader)
        
        history_total_loss.append(avg_total)
        history_td_error.append(avg_td)
        history_cql_penalty.append(avg_cql)
        
        if epoch % target_update_freq == 0:
            target_net.load_state_dict(policy_net.state_dict())
            
        if (epoch+1) % 10 == 0 or epoch == 0:
            print(f"Epoch [{epoch+1}/{epochs}] | TD Error: {avg_td:.4f} | CQL Penalty: {avg_cql:.4f} | Total Loss: {avg_total:.4f}")

    print("Training Complete. Saving PyTorch blueprint...")
    torch.save(policy_net.state_dict(), "rl_offline_dqn_optimized.pth")
    
    # Advanced Multi-Loss Plotting
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.plot(history_td_error, label="TD Prediction Error", color="blue")
    plt.title("Actual Prediction Error (Bellman)")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history_cql_penalty, label="CQL Pessimism Penalty", color="orange")
    plt.title("Constraint Penalty (Pessimism)")
    plt.xlabel("Epoch")
    plt.ylabel("Penalty Strength")
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig("optimized_dqn_metrics.png")
    plt.show()

if __name__ == "__main__":
    train_hybrid_dqn(epochs=100)

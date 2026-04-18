import time
import json
from database import SessionLocal, RLTrajectory
from env import RetailSupplyChainEnv
from ml_service import predict as ml_predict
from train_rl import train_agent_policy

class SelfLearningEngine:
    def __init__(self, task_id="medium"):
        self.task_id = task_id
        self.db = SessionLocal()

    def run_iteration(self, rollout_count=10, training_epochs=20, on_loss_update=None, on_step_update=None):
        print(f"\n🚀 Starting Self-Learning Iteration (Task: {self.task_id})")
        
        # 1. Rollout: Play the simulation using current NN policy
        env = RetailSupplyChainEnv(task_id=self.task_id)
        trajectories_collected = 0
        
        for i in range(rollout_count):
            obs = env.reset()
            done = False
            total_profit = 0
            
            while not done:
                day = obs.day
                state_json = obs.model_dump_json()
                
                # Use CURRENT NN Policy
                action = ml_predict(obs, self.task_id)
                action_json = action.model_dump_json()
                
                obs, reward, done, info = env.step(action)
                total_profit += info.get("step_profit", 0)
                
                if on_step_update:
                    on_step_update({
                        "profit": total_profit,
                        "backlog": obs.backlog,
                        "inventory": obs.inventory_central + obs.inventory_regional,
                        "day": day
                    })
                
                # Save this experience to the DB
                traj = RLTrajectory(
                    task_id=self.task_id,
                    day=day,
                    observation_state_json=state_json,
                    action_taken_json=action_json,
                    reward=float(reward.value)
                )
                self.db.add(traj)
                trajectories_collected += 1
            
            self.db.commit()
            print(f"  Run {i+1}/{rollout_count} Complete. Profit: ${total_profit:.2f}")

        print(f"✅ Collected {trajectories_collected} new experiences.")

        # 2. Retrain: Update the model with the expanded dataset
        print(f"🧠 Retraining Agent Policy...")
        train_agent_policy(epochs=training_epochs, on_epoch_end=on_loss_update)
        print("🎉 Iteration Complete. AI Model Updated.")

if __name__ == "__main__":
    engine = SelfLearningEngine()
    # Run 3 improvement loops
    for loop in range(3):
        print(f"\n--- LOOP {loop+1} ---")
        engine.run_iteration(rollout_count=5, training_epochs=30)

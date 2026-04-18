import json
from env import RetailSupplyChainEnv
from math_agent import MultiEchelonBaseStockAgent
from database import SessionLocal, RLTrajectory

def seed_database():
    print("Initializing Seed Data Generation...")
    
    agent = MultiEchelonBaseStockAgent()
    total_records = 0
    
    with SessionLocal() as db:
        # Check if already seeded to avoid duplicates
        count = db.query(RLTrajectory).count()
        if count >= 63:
            print(f"Database already contains {count} trajectory records. Skipping generation.")
            return

        for task_id in ["easy", "medium", "hard"]:
            print(f"Running math agent on task: {task_id}")
            env = RetailSupplyChainEnv(task_id=task_id, seed=17)
            obs = env.reset()
            done = False
            
            while not done:
                action = agent(obs, task_id)
                day = obs.day
                
                # Capture state before step for RL
                state_json = obs.model_dump_json()
                action_json = action.model_dump_json()

                obs, reward, done, info = env.step(action)
                
                traj = RLTrajectory(
                    task_id=task_id,
                    day=day,
                    observation_state_json=state_json,
                    action_taken_json=action_json,
                    reward=float(reward.value)
                )
                db.add(traj)
                total_records += 1
                
        db.commit()
    print(f"✅ Successfully generated {total_records} RLTrajectory records!")

if __name__ == "__main__":
    seed_database()

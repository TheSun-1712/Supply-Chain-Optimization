from env import RetailSupplyChainEnv
from math_agent import MultiEchelonBaseStockAgent

env = RetailSupplyChainEnv(task_id="medium", seed=42, custom_horizon=100)
obs = env.reset()
agent = MultiEchelonBaseStockAgent()

done = False
for step in range(30):
    action = agent(obs, env.task_id)
    obs, reward, done, info = env.step(action)
    print(f"Day {obs.day}: Action({action.operation}) -> Inv C:{obs.inventory_central} R:{obs.inventory_regional} | Dem:{info['demand']} | Rev:${info['revenue']:.2f}")
    if done:
        break

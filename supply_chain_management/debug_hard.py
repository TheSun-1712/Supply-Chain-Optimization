from env import RetailSupplyChainEnv
from math_agent import MultiEchelonBaseStockAgent

env = RetailSupplyChainEnv(task_id="hard", seed=17)
agent = MultiEchelonBaseStockAgent()

obs = env.reset()
done = False

total_revenue = 0
total_holding_c = 0
total_holding_r = 0
total_backlog = 0
total_order_fixed = 0
total_order_qty = 0
total_transfer = 0
total_expedite = 0

while not done:
    prev_c_inv = env.inventory_central
    prev_r_inv = env.inventory_regional
    
    action = agent(obs, "hard")
    
    # Costs
    op_cost = 0
    if action.operation == "order":
        fixed = env.cfg.fixed_order_overseas if action.supplier == 'overseas' else env.cfg.fixed_order_local
        unit = env.cfg.overseas_unit_cost if action.supplier == 'overseas' else env.cfg.local_unit_cost
        cost = (fixed + action.quantity * unit) * obs.fuel_cost_multiplier
        total_order_fixed += fixed * obs.fuel_cost_multiplier
        total_order_qty += action.quantity * unit * obs.fuel_cost_multiplier
    elif action.operation == "transfer":
        qty = min(prev_c_inv, action.quantity)
        total_transfer += qty * env.cfg.transfer_cost * obs.fuel_cost_multiplier
    elif action.operation == "expedite":
        total_expedite += env.cfg.expedite_cost * obs.fuel_cost_multiplier

    obs, reward, done, info = env.step(action)
    
    # Financials
    total_revenue += info["fulfilled"] * env.cfg.unit_price * (1.0 - action.discount_pct)
    total_holding_c += prev_c_inv * env.cfg.holding_cost_central * env.fuel_cost_multiplier
    total_holding_r += prev_r_inv * env.cfg.holding_cost_regional * env.fuel_cost_multiplier
    total_backlog += env.backlog * env.cfg.backlog_cost

print("=== HARD TASK POST-MORTEM ===")
print(f"Revenue: ${total_revenue:,.2f}")
print("--- COSTS ---")
print(f"Order Fixed: ${total_order_fixed:,.2f}")
print(f"Order Unit: ${total_order_qty:,.2f}")
print(f"Transfer: ${total_transfer:,.2f}")
print(f"Expedite: ${total_expedite:,.2f}")
print(f"Holding Central: ${total_holding_c:,.2f}")
print(f"Holding Regional: ${total_holding_r:,.2f}")
print(f"Backlog Penalty: ${total_backlog:,.2f}")
print(f"TOTAL COSTS: ${(total_order_fixed+total_order_qty+total_transfer+total_expedite+total_holding_c+total_holding_r+total_backlog):,.2f}")
print(f"FINAL PROFIT: ${env.cumulative_profit:,.2f}")


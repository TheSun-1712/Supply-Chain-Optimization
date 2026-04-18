import streamlit as st
import pandas as pd
import json
from env import RetailSupplyChainEnv
from math_agent import MultiEchelonBaseStockAgent
from database import SessionLocal, RLTrajectory

st.set_page_config(page_title="Supply Chain Sim", layout="wide")

st.title("📦 Multi-Echelon Supply Chain Simulation")
st.markdown("Monitor and simulate the effects of fuel volatility and weather disruptions on your dual-supplier inventory management agent.")

# Sidebar
st.sidebar.header("Agent Configuration")
task_id = st.sidebar.selectbox("Difficulty Profile", ["easy", "medium", "hard"])
seed = st.sidebar.number_input("Random Seed", value=17)

st.sidebar.markdown("---")
st.sidebar.markdown("**Agent Logic**\nThe current mathematical OR agent uses a dual-basestock `(s, S)` policy to maintain supply at the Central Hub and stock at the Regional Store.")

if st.sidebar.button("Run Simulation", type="primary"):
    env = RetailSupplyChainEnv(task_id=task_id, seed=seed)
    agent = MultiEchelonBaseStockAgent()
    
    obs = env.reset()
    done = False
    
    logs = []
    
    while not done:
        action = agent(obs, task_id)
        day = obs.day
        
        # Capture state before step for RL
        state_json = obs.model_dump_json()
        action_json = action.model_dump_json()

        obs, reward, done, info = env.step(action)
        
        # Save to Database for RL Training
        with SessionLocal() as db:
            traj = RLTrajectory(
                task_id=task_id,
                day=day,
                observation_state_json=state_json,
                action_taken_json=action_json,
                reward=float(reward.value)
            )
            db.add(traj)
            db.commit()
        
        logs.append({
            "Day": day,
            "Central Inventory": obs.inventory_central,
            "Regional Inventory": obs.inventory_regional,
            "Demand Today": obs.demand_today,
            "Weather": obs.weather_condition.title(),
            "Route Status": obs.overseas_route_status.title(),
            "Fuel Multiplier": obs.fuel_cost_multiplier,
            "Action": action.operation.upper(),
            "Daily Profit": info["step_profit"],
            "Cumulative Profit": obs.cumulative_profit,
            "Service Level": info["service_level"],
            "Backlog": obs.backlog
        })
    
    df = pd.DataFrame(logs)
    
    # KPIs
    st.subheader(f"📊 Results for Task: {task_id.capitalize()}")
    
    col1, col2, col3, col4 = st.columns(4)
    final_profit = df['Cumulative Profit'].iloc[-1]
    col1.metric("Final Cumulative Profit", f"${final_profit:,.2f}", f"${df['Daily Profit'].iloc[-1]:,.2f} on final day")
    col2.metric("Avg Service Level", f"{df['Service Level'].mean()*100:.1f}%")
    col3.metric("Final Backlog Items", f"{df['Backlog'].iloc[-1]}")
    col4.metric("Avg Fuel Cost Multiple", f"{df['Fuel Multiplier'].mean():.2f}x")
    
    # Charts
    st.markdown("### Inventory Logistics & Health")
    st.line_chart(df.set_index("Day")[["Central Inventory", "Regional Inventory", "Backlog"]])
    
    st.markdown("### Financial Trajectory")
    st.line_chart(df.set_index("Day")[["Cumulative Profit"]])

    st.markdown("### Environmental Heatmap")
    st.line_chart(df.set_index("Day")[["Fuel Multiplier"]], color="#ffaa00")

    st.markdown("### Detailed Agent Trace logs")
    # Style the dataframe slightly
    styled_df = df.style.applymap(
        lambda x: 'background-color: #ffcccc' if x == 'Blocked' else ('background-color: #ffffcc' if x == 'Delayed' else ''), subset=['Route Status']
    )
    st.dataframe(styled_df, use_container_width=True)

else:
    st.info("👈 Click **Run Simulation** in the sidebar to execute the mathematical agent and view the results!")

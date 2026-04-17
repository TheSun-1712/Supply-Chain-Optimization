import time
from openai import OpenAI
import streamlit as st
import pandas as pd
from env import RetailSupplyChainEnv
from math_agent import MultiEchelonBaseStockAgent

st.set_page_config(page_title="Supply Chain Co-Pilot", layout="wide")

st.title("📦 Supply Chain Co-Pilot")
st.markdown("Mathematical `(s, S)` Base-Stock Operations driven simulation, guided by an AI Co-Pilot.")

# 1. State Initialization
if "env" not in st.session_state:
    st.session_state.env = RetailSupplyChainEnv(task_id="medium", seed=17, custom_horizon=90)
    st.session_state.obs = st.session_state.env.reset()
    st.session_state.logs = []
    st.session_state.done = False
    st.session_state.agent = MultiEchelonBaseStockAgent()
    st.session_state.auto_play = False
    st.session_state.messages = [{"role": "assistant", "content": "Hello! I am your AI Co-Pilot powered by Qwen. I have access to the real-time simulation state. How can I help?"}]

# 2. Sidebar configuration
st.sidebar.header("Configuration")
custom_horizon = st.sidebar.slider("Simulation Length (Days)", min_value=21, max_value=365, value=90)
task_id = st.sidebar.selectbox("Difficulty Profile", ["easy", "medium", "hard"], index=1)
# Removed Ollama model input box to avoid confusion since the openai client logic handles it below natively for qwen3.5

if st.sidebar.button("Reset Simulation", type="primary"):
    st.session_state.env = RetailSupplyChainEnv(task_id=task_id, seed=17, custom_horizon=custom_horizon)
    st.session_state.obs = st.session_state.env.reset()
    st.session_state.logs = []
    st.session_state.done = False
    st.session_state.agent = MultiEchelonBaseStockAgent()
    st.session_state.auto_play = False
    st.session_state.messages = [{"role": "assistant", "content": "Simulation reset. How can I help?"}]
    st.rerun()

st.sidebar.markdown("---")
st.sidebar.header("God-Mode Disruptions")
col_a, col_b = st.sidebar.columns(2)
if col_a.button("Hurricane"):
    st.session_state.env.weather_condition = "hurricane"
    st.session_state.env.overseas_route_status = "blocked"
    st.sidebar.success("Hurricane Triggered!")

if col_b.button("Fuel Spike"):
    st.session_state.env.fuel_cost_multiplier = min(3.5, st.session_state.env.fuel_cost_multiplier + 1.5)
    st.sidebar.success("Fuel Dropped!")

if st.sidebar.button("Demand Shock (+200%)"):
    day = st.session_state.env.day
    if day < st.session_state.env.cfg.horizon_days:
        idx = day % len(st.session_state.env.cfg.demand_series)
        st.session_state.env.cfg.demand_series[idx] *= 3
        st.sidebar.success("Demand Shocked!")

# 3. Execution logic
def run_step():
    env = st.session_state.env
    obs = st.session_state.obs
    agent = st.session_state.agent
    
    if st.session_state.done: return
        
    action = agent(obs, env.task_id)
    day = obs.day
    obs, reward, done, info = env.step(action)
    
    st.session_state.obs = obs
    st.session_state.done = done
    
    # Track verbose variables in the logs directly
    st.session_state.logs.append({
        "Day": day,
        "Central Inv": obs.inventory_central,
        "Regional Inv": obs.inventory_regional,
        "Demand": obs.demand_today,
        "Backlog": obs.backlog,
        "Weather": obs.weather_condition.title(),
        "Route Status": obs.overseas_route_status.title(),
        "Fuel Cost (x)": round(obs.fuel_cost_multiplier, 2),
        "Agent Action": action.operation.upper(),
        "Qty": action.quantity,
        "Supplier": action.supplier if action.operation == "order" else "",
        "Daily Profit ($)": round(info["step_profit"], 2),
        "Total Profit ($)": round(obs.cumulative_profit, 2),
    })

# 4. App Layout: Sim Left, Chat Right
left_col, right_col = st.columns([2, 1])

with left_col:
    st.header("Simulation Dashboard")
    st.session_state.auto_play = st.checkbox("Auto-Play (3s interval)", value=st.session_state.auto_play)
    if st.button("Step Forward 1 Day"):
        run_step()
        
    if st.session_state.auto_play and not st.session_state.done:
        run_step()
        
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Day", f"{st.session_state.obs.day} / {st.session_state.env.cfg.horizon_days}")
    m2.metric("Route Status", st.session_state.env.overseas_route_status.title())
    m3.metric("Fuel Mult", f"{st.session_state.env.fuel_cost_multiplier:.2f}x")
    m4.metric("Cumulative Profit", f"${st.session_state.obs.cumulative_profit:,.2f}")
    
    if len(st.session_state.logs) > 0:
        df = pd.DataFrame(st.session_state.logs)
        
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("### Inventory Curve")
            st.line_chart(df.set_index("Day")[["Central Inv", "Regional Inv", "Backlog"]])
        with c2:
            st.markdown("### Financial Curve")
            st.line_chart(df.set_index("Day")[["Total Profit ($)"]])
        
        st.markdown("### Simulation Logs")
        styled_df = df.style.applymap(
            lambda x: 'background-color: #ffcccc' if x == 'Blocked' else ('background-color: #ffffcc' if x == 'Delayed' else ''), subset=['Route Status']
        )
        st.dataframe(styled_df, use_container_width=True, hide_index=True)

with right_col:
    st.header("Qwen Co-Pilot")
    st.markdown("Ask questions about the current state!")
    
    # Display Chat History 
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            
    if prompt := st.chat_input("Ask Qwen..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
            
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            
            # Inject tight context
            o = st.session_state.obs
            context = f"""[SYSTEM CONTEXT]
You are a Supply Chain analyst Co-Pilot. Be concise.
The user is watching a simulation. Here is the exact current state for Day {o.day}:
- Central Inventory: {o.inventory_central}
- Regional Inventory: {o.inventory_regional}
- Backlog Unfulfilled: {o.backlog}
- Weather: {o.weather_condition}
- Overseas Route: {o.overseas_route_status}
- Fuel Cost Multiplier: {o.fuel_cost_multiplier:.2f}x
- Cumulative Profit: ${o.cumulative_profit:.2f}
[END SYSTEM CONTEXT]

User asks: {prompt}"""

            try:
                client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
                
                response = client.chat.completions.create(
                    model="qwen3.5:latest",
                    messages=[
                        {"role": "system", "content": context},
                        {"role": "user", "content": prompt}
                    ]
                )
                reply = response.choices[0].message.content
            except Exception as e:
                reply = f"Error connecting to Ollama: {e}"
                
            message_placeholder.markdown(reply)
            st.session_state.messages.append({"role": "assistant", "content": reply})

if st.session_state.auto_play and not st.session_state.done:
    time.sleep(3)
    st.rerun()

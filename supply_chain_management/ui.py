import time
from openai import OpenAI
import streamlit as st
import pandas as pd
import json
from env import RetailSupplyChainEnv
from analysis_prompts import build_chat_context
from math_agent import MultiEchelonBaseStockAgent
from database import init_db, SessionLocal, User, SimulationSession, RLTrajectory

st.set_page_config(page_title="Supply Chain Co-Pilot", layout="wide")

st.title("📦 Supply Chain Co-Pilot")
st.markdown("Mathematical `(s, S)` Base-Stock Operations driven simulation, guided by an AI Co-Pilot.")

CHAT_MODE_LABELS = {
    "supply_chain": "Supply Chain Analysis",
    "producer_analysis": "Producer Analysis",
}


def _initial_chat_messages() -> dict[str, list[dict[str, str]]]:
    return {
        "supply_chain": [
            {
                "role": "assistant",
                "content": "Hello! I can help with inventory, disruptions, route status, backlog, and replenishment decisions.",
            }
        ],
        "producer_analysis": [
            {
                "role": "assistant",
                "content": "Hello! I can help with raw material procurement, assembly planning, component shortages, and upstream risk.",
            }
        ],
    }

# 1. Sidebar configuration
st.sidebar.header("Configuration")
custom_horizon = st.sidebar.slider("Simulation Length (Days)", min_value=21, max_value=5000, value=365)
task_id = st.sidebar.selectbox("Difficulty Profile", ["easy", "medium", "hard"], index=1)
ollama_model = st.sidebar.selectbox("Ollama Co-Pilot Model", ["llama3:latest", "qwen3.5:latest"], index=0)
auto_speed = st.sidebar.slider("Auto-Play Speed (Seconds/Day)", min_value=0.1, max_value=5.0, value=0.1, step=0.1)

# 2. State Initialization
if "env" not in st.session_state:
    init_db()
    with SessionLocal() as db:
        admin_user = db.query(User).filter_by(username="admin").first()
        
        # Create a new Simulation Session in the DB
        sim_session = SimulationSession(
            user_id=admin_user.id,
            task_id=task_id,
            horizon_days=custom_horizon,
            seed=17
        )
        db.add(sim_session)
        db.commit()
        st.session_state.db_session_id = sim_session.id

    st.session_state.env = RetailSupplyChainEnv(task_id=task_id, seed=17, custom_horizon=custom_horizon)
    st.session_state.obs = st.session_state.env.reset()
    st.session_state.prev_obs_json = st.session_state.obs.model_dump_json() # Keep track of 'State'
    st.session_state.logs = []
    st.session_state.done = False
    st.session_state.agent = MultiEchelonBaseStockAgent()
    st.session_state.auto_play = False
    st.session_state.chat_mode = "supply_chain"
    st.session_state.chat_messages = _initial_chat_messages()
    st.session_state.chat_mode_select = CHAT_MODE_LABELS["supply_chain"]

import dataclasses
if st.session_state.env.cfg.horizon_days != custom_horizon:
    st.session_state.env.cfg = dataclasses.replace(st.session_state.env.cfg, horizon_days=custom_horizon)
    st.session_state.env.custom_horizon = custom_horizon
if st.session_state.env.done and st.session_state.env.day < custom_horizon:
    st.session_state.env.done = False  # Un-freeze if they intentionally artificially extended the deadline
    st.session_state.done = False

if st.sidebar.button("Reset Simulation", type="primary"):
    with SessionLocal() as db:
        admin_user = db.query(User).filter_by(username="admin").first()
        sim_session = SimulationSession(
            user_id=admin_user.id,
            task_id=task_id,
            horizon_days=custom_horizon,
            seed=17
        )
        db.add(sim_session)
        db.commit()
        st.session_state.db_session_id = sim_session.id

    st.session_state.env = RetailSupplyChainEnv(task_id=task_id, seed=17, custom_horizon=custom_horizon)
    st.session_state.obs = st.session_state.env.reset()
    st.session_state.prev_obs_json = st.session_state.obs.model_dump_json()
    st.session_state.logs = []
    st.session_state.done = False
    st.session_state.agent = MultiEchelonBaseStockAgent()
    st.session_state.auto_play = False
    st.session_state.chat_mode = "supply_chain"
    st.session_state.chat_messages = _initial_chat_messages()
    st.session_state.chat_mode_select = CHAT_MODE_LABELS["supply_chain"]
    st.rerun()

st.sidebar.markdown("---")
with SessionLocal() as db:
    total_logs = db.query(RLTrajectory).count()
st.sidebar.metric("🗄️ Saved Database Logs", total_logs, help="Total historical State/Action/Reward tuples available for RL Training")

st.sidebar.markdown("---")
st.sidebar.header("God-Mode Disruptions")
col_a, col_b = st.sidebar.columns(2)
if col_a.button("Hurricane"):
    st.session_state.env.weather_condition = "hurricane"
    st.session_state.env.overseas_route_status = "blocked"
    st.session_state.env.manual_weather_override = 5 # 5 days unbreakable override
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
    next_obs, reward, done, info = env.step(action)
    
    # -------------------------------------------------------------
    # PHASE 1 RL DB LOGGING: COMMIT (State, Action, Reward, NextState)
    # -------------------------------------------------------------
    with SessionLocal() as db:
        traj = RLTrajectory(
            session_id=st.session_state.db_session_id,
            day=day,
            observation_state_json=st.session_state.prev_obs_json,
            action_taken_json=action.model_dump_json(),
            step_profit=info["step_profit"],
            service_level=info["service_level"],
            next_state_json=next_obs.model_dump_json(),
            is_done=done
        )
        db.add(traj)
        
        if done:
            sim = db.query(SimulationSession).filter_by(id=st.session_state.db_session_id).first()
            if sim:
                sim.final_profit = next_obs.cumulative_profit
                
        db.commit()
    
    # Cascade states for next loop
    st.session_state.obs = next_obs
    st.session_state.prev_obs_json = next_obs.model_dump_json()
    st.session_state.done = done
    obs = next_obs
    
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
        "Revenue ($)": round(info["revenue"], 2),
        "Total Costs ($)": round(info["op_cost"] + info["holding_cost"] + info["backlog_penalty"], 2),
        "Daily Profit ($)": round(info["step_profit"], 2),
        "Total Profit ($)": round(obs.cumulative_profit, 2),
    })

# 4. App Layout: Sim Left, Chat Right
left_col, right_col = st.columns([2, 1])

with left_col:
    st.header("Simulation Dashboard")
    
    # Execution Controls
    col_play, col_pause, col_step = st.columns(3)
    if col_play.button("▶ Auto-Play", use_container_width=True):
        st.session_state.auto_play = True
        st.rerun()
    if col_pause.button("⏸ Pause", use_container_width=True):
        st.session_state.auto_play = False
        st.rerun()
    if col_step.button("⏭ Step Forward", use_container_width=True):
        st.session_state.auto_play = False
        run_step()

    if st.session_state.auto_play:
        st.success("Auto-Play is RUNNING")
    else:
        st.warning("Simulation is PAUSED")
        
    if st.session_state.auto_play and not st.session_state.done:
        run_step()
        
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Day", f"{st.session_state.obs.day} / {st.session_state.env.cfg.horizon_days}")
    m2.metric("Route Status", st.session_state.env.overseas_route_status.title())
    m3.metric("Fuel Mult", f"{st.session_state.env.fuel_cost_multiplier:.2f}x")
    m4.metric("Cumulative Profit", f"${st.session_state.obs.cumulative_profit:,.2f}")

    if len(st.session_state.logs) > 0:
        latest = st.session_state.logs[-1]
        st.markdown("### Stock & Finances")
        s1, s2, s3, s4 = st.columns(4)
        
        total_stock = latest["Central Inv"] + latest["Regional Inv"]
        target_stock = st.session_state.env.cfg.target_inventory_regional + st.session_state.env.cfg.initial_inventory_central
        deficit = total_stock - target_stock
        
        s1.metric("Total Available Stock", f"{total_stock:,}", delta=f"{deficit} units vs Target", delta_color="normal")
        s2.metric("Current Backlog", f"{latest['Backlog']}", delta="Unfulfilled Demands", delta_color="inverse")
        s3.metric("Today's Expenses", f"${latest['Total Costs ($)']:,.2f}")
        s4.metric("Today's Revenue", f"${latest['Revenue ($)']:,.2f}", f"${latest['Daily Profit ($)']:,.2f} Net Profit")
    
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
    st.markdown("Ask questions about the current state or switch to upstream producer analysis.")
    selected_mode_label = st.selectbox(
        "Analysis Mode",
        list(CHAT_MODE_LABELS.values()),
        index=0,
        key="chat_mode_select",
    )
    selected_mode = next(mode for mode, label in CHAT_MODE_LABELS.items() if label == selected_mode_label)
    st.session_state.chat_mode = selected_mode
    
    # Display Chat History 
    for message in st.session_state.chat_messages[selected_mode]:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            
    prompt_placeholder = "Ask about supply-chain state..." if selected_mode == "supply_chain" else "Ask about procurement and production planning..."
    if prompt := st.chat_input(prompt_placeholder):
        st.session_state.chat_messages[selected_mode].append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
            
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            
            # Inject tight context
            o = st.session_state.obs
            context = build_chat_context(selected_mode, o)

            try:
                client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
                
                response = client.chat.completions.create(
                    model=ollama_model,
                    messages=[
                        {"role": "system", "content": context},
                        {"role": "user", "content": prompt}
                    ]
                )
                reply = response.choices[0].message.content
            except Exception as e:
                reply = f"Error connecting to Ollama: {e}"
                
            message_placeholder.markdown(reply)
            st.session_state.chat_messages[selected_mode].append({"role": "assistant", "content": reply})

if st.session_state.auto_play and not st.session_state.done:
    time.sleep(auto_speed)
    st.rerun()

from __future__ import annotations

import os
import json
from typing import Dict, List, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from env import RetailSupplyChainEnv
from schema import Action, StepResult, Observation
from news_service import GlobalIntelService
from database import SessionLocal, SimulationRun, RLTrajectory
from grader import SupplyChainGrader
from ml_service import predict as ml_predict, get_model_status
from self_improvement import SelfLearningEngine
import threading

class ResetRequest(BaseModel):
    task_id: str = "easy"
    seed: int = 17
    use_live_intel: bool = True

class StepRequest(BaseModel):
    operation: str = "noop"
    quantity: int = 0
    target_shipment_id: int | None = None
    discount_pct: float = 0.0
    rationale: str = ""

class SimulateRequest(BaseModel):
    difficulty: str = "easy"
    seed: int = 17
    agent: str = "math" # 'math' or 'nn'

class ChatMessage(BaseModel):
    role: str
    content: str

class ExplainRequest(BaseModel):
    observation: Dict[str, Any]
    action: Dict[str, Any]
    history: List[ChatMessage] = []

app = FastAPI(title="Retail Supply Chain OpenEnv", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_instances: Dict[str, RetailSupplyChainEnv] = {}
_DEFAULT_ENV_KEY = "default"
_LIVE_TRAINING_LOSS: List[float] = []
_LIVE_ROLLOUT_STATS: List[Dict[str, Any]] = []

def _get_env() -> RetailSupplyChainEnv:
    if _DEFAULT_ENV_KEY not in _instances:
        _instances[_DEFAULT_ENV_KEY] = RetailSupplyChainEnv(task_id="easy", seed=17)
    return _instances[_DEFAULT_ENV_KEY]

@app.get("/")
def root() -> Dict[str, str]:
    return {
        "name": "retail_supply_chain_openenv",
        "status": "ok",
        "hint": "Use POST /reset, POST /step, GET /state",
    }

@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}

@app.get("/intel/current")
def get_current_intel():
    return GlobalIntelService.fetch_current_shocks()

@app.post("/reset")
def reset(req: ResetRequest = ResetRequest()):
    try:
        env = RetailSupplyChainEnv(task_id=req.task_id, seed=req.seed, use_live_intel=req.use_live_intel)
        _instances[_DEFAULT_ENV_KEY] = env
        obs = env.reset()
        return {"observation": obs.model_dump(), "done": False, "info": {"task_id": req.task_id}}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.post("/step")
def step(req: StepRequest):
    env = _get_env()
    try:
        action = Action(
            operation=req.operation,
            quantity=req.quantity,
            target_shipment_id=req.target_shipment_id,
            discount_pct=req.discount_pct,
            rationale=req.rationale,
        )
        obs, reward, done, info = env.step(action)
        result = StepResult(observation=obs, reward=reward, done=done, info=info)
        return result.model_dump()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.get("/state")
def state():
    env = _get_env()
    return env.state().model_dump()

# --- SaaS API Endpoints ---

@app.post("/simulate")
def simulate(req: SimulateRequest):
    env = RetailSupplyChainEnv(task_id=req.difficulty, seed=req.seed)
    obs = env.reset()
    done = False
    
    trace = []
    
    # We load Math agent manually for 'math' option
    from math_agent import MultiEchelonBaseStockAgent
    math_agent = MultiEchelonBaseStockAgent()

    while not done:
        day = obs.day
        if req.agent == "nn":
            action = ml_predict(obs, req.difficulty)
        else:
            action = math_agent(obs, req.difficulty)
            
        obs, reward, done, info = env.step(action)
        
        trace.append({
            "day": day,
            "inventory_central": obs.inventory_central,
            "inventory_regional": obs.inventory_regional,
            "backlog": obs.backlog,
            "weather": obs.weather_condition,
            "route_status": obs.overseas_route_status,
            "fuel_cost_multiplier": obs.fuel_cost_multiplier,
            "action": action.operation,
            "quantity": action.quantity,
            "supplier": action.supplier if action.operation == "order" else None,
            "profit": info.get("step_profit", 0),
            "cumulative_profit": obs.cumulative_profit,
            "service_level": info.get("service_level", 0),
            "reward": reward.value
        })

    # Save to DB
    state_dump = env.state()
    avg_service = sum([t["service_level"] for t in trace]) / max(1, len(trace))
    final_profit = state_dump.cumulative_profit
    
    grader = SupplyChainGrader(seed=req.seed)
    score = grader._score(req.difficulty, sum([t["reward"] for t in trace])/max(1, len(trace)), avg_service, final_profit, sum(1 for t in trace if t["backlog"] > 0), len(trace))
    
    db = SessionLocal()
    run = SimulationRun(
        task_id=req.difficulty,
        agent_type=req.agent,
        final_profit=final_profit,
        avg_service_level=avg_service,
        score=score,
        steps=len(trace)
    )
    db.add(run)
    db.commit()
    db.close()

    return {
        "difficulty": req.difficulty,
        "agent": req.agent,
        "final_profit": final_profit,
        "avg_service_level": avg_service,
        "score": score,
        "trace": trace
    }

@app.post("/predict")
def predict_action(req: Dict[str, Any]):
    obs = Observation(**req["observation"])
    task_id = req.get("task_id", "medium")
    action = ml_predict(obs, task_id)
    return {"action": action.model_dump()}

@app.post("/grade")
def grade(difficulties: List[str]):
    grader = SupplyChainGrader(seed=17)
    
    from math_agent import MultiEchelonBaseStockAgent
    def agent_adapter(obs, task_id):
        return ml_predict(obs, task_id)
        
    results = []
    for d in difficulties:
        grade = grader.grade_task(d, agent_adapter)
        results.append({
            "task_id": grade.task_id,
            "score": grade.score,
            "avg_reward": grade.avg_reward,
            "service_level": grade.service_level,
            "profit": grade.profit,
            "backlog_days": grade.backlog_days,
            "steps": grade.steps
        })
        
    overall = sum([r["score"] for r in results]) / max(1, len(results))
    return {
        "overall_score": overall,
        "tasks": results
    }

@app.post("/explain")
def explain_action(req: ExplainRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured on server.")
        
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url=os.getenv("API_BASE_URL", "https://api.openai.com/v1"))
    
    system_prompt = (
        "You are an AI assistant in a supply chain simulator. "
        "Given the current state of the supply chain and the action recommended by the Neural Network model, "
        "explain to the user in simple, plain English WHY the model likely chose this action, "
        "what the numbers mean, and what risks it is mitigating. "
        "Keep your explanations concise (2-4 sentences max unless detailed). "
        "If the user asks follow-up questions, answer them directly based on the context."
    )
    
    context = (
        f"Current State: {json.dumps(req.observation)}\n"
        f"Recommended Action: {json.dumps(req.action)}"
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Please explain this decision based on the following context:\n{context}"}
    ]
    
    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})
        
    try:
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
            messages=messages,
            temperature=0.7
        )
        return {"explanation": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history():
    db = SessionLocal()
    runs = db.query(SimulationRun).order_by(SimulationRun.timestamp.desc()).limit(20).all()
    res = []
    for r in runs:
        res.append({
            "id": r.id,
            "task_id": r.task_id,
            "agent_type": r.agent_type,
            "final_profit": r.final_profit,
            "avg_service_level": r.avg_service_level,
            "score": r.score,
            "steps": r.steps,
            "timestamp": r.timestamp.isoformat()
        })
    db.close()
    return res

@app.get("/analytics/training-curve")
def get_training_curve():
    # Merge persisted history with live updates
    history = []
    path = "training_history.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            history = json.load(f)
    
    # Append live buffer
    return history + _LIVE_TRAINING_LOSS

@app.get("/analytics/live-rollout")
def get_live_rollout():
    return _LIVE_ROLLOUT_STATS

@app.post("/learning/start")
def start_learning(task_id: str = "medium"):
    engine = SelfLearningEngine(task_id=task_id)
    
    def on_loss(loss):
        _LIVE_TRAINING_LOSS.append(loss)
        if len(_LIVE_TRAINING_LOSS) > 500: # Cap memory
            _LIVE_TRAINING_LOSS.pop(0)

    def on_step(stats):
        _LIVE_ROLLOUT_STATS.append(stats)
        if len(_LIVE_ROLLOUT_STATS) > 300: # Cap to about 3 rollouts
            _LIVE_ROLLOUT_STATS.pop(0)

    def run_loop():
        _LIVE_TRAINING_LOSS.clear()
        _LIVE_ROLLOUT_STATS.clear()
        # Run 5 loops of self-improvement
        for _ in range(5):
            engine.run_iteration(rollout_count=10, training_epochs=20, on_loss_update=on_loss, on_step_update=on_step)
            
    thread = threading.Thread(target=run_loop)
    thread.start()
    return {"status": "Learning loop started in background", "task_id": task_id}

@app.get("/model/status")
def model_status():
    db = SessionLocal()
    count = db.query(RLTrajectory).count()
    db.close()
    
    status = get_model_status()
    status["trajectory_count"] = count
    return status

from __future__ import annotations

from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from env import RetailSupplyChainEnv
from schema import Action, StepResult


class ResetRequest(BaseModel):
    task_id: str = "easy"
    seed: int = 17


class StepRequest(BaseModel):
    operation: str = "noop"
    quantity: int = 0
    target_shipment_id: int | None = None
    discount_pct: float = 0.0
    rationale: str = ""


app = FastAPI(title="Retail Supply Chain OpenEnv", version="1.0.0")
_instances: Dict[str, RetailSupplyChainEnv] = {}
_DEFAULT_ENV_KEY = "default"


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


@app.post("/reset")
def reset(req: ResetRequest = ResetRequest()):
    try:
        env = RetailSupplyChainEnv(task_id=req.task_id, seed=req.seed)
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

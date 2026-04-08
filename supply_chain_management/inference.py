from __future__ import annotations

import json
import os
from typing import List

from openai import OpenAI

from env import RetailSupplyChainEnv
from grader import SupplyChainGrader, heuristic_policy
from schema import Action, Observation

API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("HF_TOKEN", "")
BENCHMARK = "retail_supply_chain_openenv"
MAX_STEPS_HARD_CAP = 64


def log_start(task: str, env: str, model: str) -> None:
    print(f"[START] task={task} env={env} model={model}", flush=True)


def log_step(step: int, action: str, reward: float, done: bool, error: str | None) -> None:
    safe_action = action.replace("\n", " ").strip()
    safe_error = "null" if error is None else error.replace("\n", " ").strip()
    print(
        f"[STEP] step={step} action={safe_action} reward={reward:.4f} done={str(done).lower()} error={safe_error}",
        flush=True,
    )


def log_end(success: bool, steps: int, score: float, rewards: List[float]) -> None:
    rewards_blob = ",".join(f"{x:.4f}" for x in rewards)
    print(
        f"[END] success={str(success).lower()} steps={steps} score={score:.4f} rewards=[{rewards_blob}]",
        flush=True,
    )


def _fallback_action(observation: Observation, task_id: str) -> Action:
    return heuristic_policy(observation, task_id)


def get_model_action(client: OpenAI, task_id: str, observation: Observation, history: List[str]) -> Action:
    system = (
        "You are an operations planner. Output ONLY JSON with keys: "
        "operation, quantity, target_shipment_id, discount_pct, rationale."
    )
    user_payload = {
        "task_id": task_id,
        "observation": observation.model_dump(),
        "history": history[-6:],
        "constraints": {
            "operation": ["noop", "order", "expedite", "discount"],
            "quantity_range": [0, 500],
            "discount_range": [0.0, 0.5],
        },
    }

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            temperature=0.0,
        )
        text = response.choices[0].message.content or ""
        if not text:
            return _fallback_action(observation, task_id)

        if text.startswith("```"):
            text = text.strip("`")
            text = text.replace("json", "", 1).strip()

        parsed = json.loads(text)
        return Action.model_validate(parsed)
    except Exception:  # noqa: BLE001
        return _fallback_action(observation, task_id)


def run_task(task_id: str, client: OpenAI) -> float:
    env = RetailSupplyChainEnv(task_id=task_id, seed=17)
    history: List[str] = []
    rewards: List[float] = []

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    obs = env.reset()
    done = False
    steps_taken = 0

    while not done and steps_taken < min(env.cfg.horizon_days, MAX_STEPS_HARD_CAP):
        steps_taken += 1
        action = get_model_action(client, task_id, obs, history)
        result = f"{action.operation}|q={action.quantity}|ship={action.target_shipment_id}|d={action.discount_pct:.2f}"

        try:
            obs, reward, done, _ = env.step(action)
            rewards.append(reward.value)
            log_step(step=steps_taken, action=result, reward=reward.value, done=done, error=None)
            history.append(f"Step {steps_taken}: {result} -> reward {reward.value:.4f}")
        except Exception as exc:  # noqa: BLE001
            log_step(step=steps_taken, action=result, reward=0.0, done=True, error=str(exc))
            done = True

    score = sum(rewards) / max(1, len(rewards))
    score = max(0.0, min(1.0, score))
    success = score >= 0.65
    log_end(success=success, steps=steps_taken, score=score, rewards=rewards)
    return score


def main() -> None:
    client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

    task_scores = []
    for task in ["easy", "medium", "hard"]:
        task_scores.append(run_task(task, client))

    overall = sum(task_scores) / len(task_scores)

    grader = SupplyChainGrader(seed=17)
    heuristic = grader.evaluate_all(heuristic_policy)

    print("\nBaseline Summary", flush=True)
    print(f"model_score_easy={task_scores[0]:.4f}", flush=True)
    print(f"model_score_medium={task_scores[1]:.4f}", flush=True)
    print(f"model_score_hard={task_scores[2]:.4f}", flush=True)
    print(f"model_score_overall={overall:.4f}", flush=True)
    print(f"heuristic_overall={heuristic['overall_score']:.4f}", flush=True)


if __name__ == "__main__":
    main()

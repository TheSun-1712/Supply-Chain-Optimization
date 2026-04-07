from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Protocol

import numpy as np

from env import RetailSupplyChainEnv
from schema import Action, Observation


class Policy(Protocol):
    def __call__(self, observation: Observation, task_id: str) -> Action:
        ...


@dataclass
class TaskGrade:
    task_id: str
    score: float
    avg_reward: float
    service_level: float
    profit: float
    backlog_days: float
    steps: int


class SupplyChainGrader:
    TASK_ORDER = ["easy", "medium", "hard"]

    def __init__(self, seed: int = 17):
        self.seed = seed

    def grade_task(self, task_id: str, policy: Policy) -> TaskGrade:
        env = RetailSupplyChainEnv(task_id=task_id, seed=self.seed)
        obs = env.reset()
        done = False

        rewards: List[float] = []
        backlog_days = 0
        while not done:
            action = policy(obs, task_id)
            obs, reward, done, _ = env.step(action)
            rewards.append(reward.value)
            if obs.backlog > 0:
                backlog_days += 1

        state = env.state()
        avg_reward = float(np.mean(rewards)) if rewards else 0.0
        service_level = float(np.mean(env.service_history)) if env.service_history else 0.0
        profit = state.cumulative_profit

        score = self._score(task_id, avg_reward, service_level, profit, backlog_days, len(rewards))
        return TaskGrade(
            task_id=task_id,
            score=score,
            avg_reward=avg_reward,
            service_level=service_level,
            profit=profit,
            backlog_days=backlog_days,
            steps=len(rewards),
        )

    def evaluate_all(self, policy: Policy) -> Dict[str, object]:
        task_results = [self.grade_task(task_id, policy) for task_id in self.TASK_ORDER]
        overall = float(np.mean([t.score for t in task_results])) if task_results else 0.0
        return {
            "overall_score": round(overall, 4),
            "tasks": [
                {
                    "task_id": t.task_id,
                    "score": round(t.score, 4),
                    "avg_reward": round(t.avg_reward, 4),
                    "service_level": round(t.service_level, 4),
                    "profit": round(t.profit, 2),
                    "backlog_days": t.backlog_days,
                    "steps": t.steps,
                }
                for t in task_results
            ],
        }

    @staticmethod
    def _score(
        task_id: str,
        avg_reward: float,
        service_level: float,
        profit: float,
        backlog_days: int,
        steps: int,
    ) -> float:
        profit_targets = {"easy": 1300.0, "medium": 2100.0, "hard": 3000.0}
        allowed_backlog = {"easy": 1, "medium": 3, "hard": 6}

        reward_term = float(np.clip(avg_reward, 0.0, 1.0))
        service_term = float(np.clip(service_level, 0.0, 1.0))
        profit_term = float(np.clip(profit / profit_targets[task_id], 0.0, 1.0))
        backlog_term = 1.0 - float(np.clip(backlog_days / max(1, allowed_backlog[task_id] + steps * 0.3), 0.0, 1.0))

        # Deterministic weighted score in [0, 1]
        score = 0.35 * reward_term + 0.30 * service_term + 0.25 * profit_term + 0.10 * backlog_term
        return float(np.clip(score, 0.0, 1.0))


def heuristic_policy(observation: Observation, task_id: str) -> Action:
    cfg = {
        "easy": {"reorder": 70, "up_to": 100},
        "medium": {"reorder": 105, "up_to": 145},
        "hard": {"reorder": 135, "up_to": 190},
    }[task_id]
    inventory_position = observation.inventory + sum(s.quantity for s in observation.in_transit) - observation.backlog

    if observation.backlog > 18 and observation.in_transit:
        soonest = sorted(observation.in_transit, key=lambda s: s.eta_days)[0]
        return Action(operation="expedite", target_shipment_id=soonest.shipment_id)

    if inventory_position < cfg["reorder"]:
        qty = max(0, cfg["up_to"] - inventory_position)
        return Action(operation="order", quantity=min(300, qty))

    if observation.inventory > cfg["up_to"] + 35:
        return Action(operation="discount", discount_pct=0.10)

    return Action(operation="noop")


if __name__ == "__main__":
    grader = SupplyChainGrader(seed=17)
    result = grader.evaluate_all(heuristic_policy)
    print(result)

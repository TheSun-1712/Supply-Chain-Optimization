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
    regional_cfg = {
        "easy": {"reorder": 80, "up_to": 120},
        "medium": {"reorder": 130, "up_to": 180},
        "hard": {"reorder": 180, "up_to": 260},
    }[task_id]
    central_cfg = {
        "easy": {"reorder": 180, "up_to": 300},
        "medium": {"reorder": 240, "up_to": 350},
        "hard": {"reorder": 320, "up_to": 550},
    }[task_id]

    if observation.fuel_cost_multiplier > 2.0:
        regional_cfg["up_to"] = int(regional_cfg["up_to"] * 0.6)
        regional_cfg["reorder"] = int(regional_cfg["reorder"] * 0.6)
        central_cfg["up_to"] = int(central_cfg["up_to"] * 0.6)
        central_cfg["reorder"] = int(central_cfg["reorder"] * 0.6)

    pending_transfers = sum(s.quantity for s in observation.in_transit if s.destination == "regional")
    pending_orders = sum(s.quantity for s in observation.in_transit if s.destination == "central")

    regional_position = observation.inventory_regional + pending_transfers - observation.backlog
    central_position = observation.inventory_central + pending_orders

    # Global risk-aware anticipation: pre-order upstream components before expected hikes.
    if observation.expected_procurement_hike_7d >= 0.18 and central_position < int(central_cfg["up_to"] * 1.35):
        qty = max(observation.recommended_preorder_qty, int(central_cfg["up_to"] * 1.35 - central_position))
        qty = int(min(500, max(0, qty)))
        if qty > 0:
            supplier = "overseas" if observation.overseas_route_status == "open" else "local"
            return Action(operation="order", quantity=qty, supplier=supplier)

    # If global demand hike is expected, push more stock to regional node early.
    if observation.expected_demand_hike_7d >= 0.14 and regional_position < int(regional_cfg["up_to"] * 1.2):
        qty = int(min(450, max(0, int(regional_cfg["up_to"] * 1.2) - regional_position)))
        qty = min(qty, observation.inventory_central)
        if qty > 0:
            return Action(operation="transfer", quantity=qty)

    if observation.backlog > 15 and observation.in_transit:
        soonest = sorted(observation.in_transit, key=lambda s: s.eta_days)[0]
        if not (soonest.source == "overseas" and observation.overseas_route_status == "blocked"):
            return Action(operation="expedite", target_shipment_id=soonest.shipment_id)

    if regional_position < regional_cfg["reorder"]:
        qty = max(0, regional_cfg["up_to"] - regional_position)
        qty = min(qty, observation.inventory_central)
        if qty > 0:
            return Action(operation="transfer", quantity=int(min(450, qty)))

    if central_position < central_cfg["reorder"]:
        qty = max(0, central_cfg["up_to"] - central_position)
        supplier = "local" if observation.overseas_route_status in ["blocked", "delayed"] else "overseas"
        return Action(operation="order", quantity=int(min(500, qty)), supplier=supplier)

    if observation.inventory_regional > regional_cfg["up_to"] + 60:
        return Action(operation="discount", discount_pct=0.15)

    return Action(operation="noop")


if __name__ == "__main__":
    grader = SupplyChainGrader(seed=17)
    result = grader.evaluate_all(heuristic_policy)
    print(result)

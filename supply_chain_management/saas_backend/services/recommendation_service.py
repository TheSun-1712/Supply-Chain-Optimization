from __future__ import annotations

from functools import lru_cache

from ..rl_engine.model import RLEngine
from ..schemas.domain import RecommendationResponse, SystemState


@lru_cache(maxsize=1)
def get_rl_engine() -> RLEngine:
    return RLEngine()


def recommend_action(state: SystemState) -> RecommendationResponse:
    return get_rl_engine().recommend_response(state)

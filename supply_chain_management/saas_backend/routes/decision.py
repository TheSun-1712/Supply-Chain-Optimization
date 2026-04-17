from __future__ import annotations

from fastapi import APIRouter

from ..schemas.domain import RecommendationRequest, RecommendationResponse
from ..services.recommendation_service import recommend_action

router = APIRouter(tags=["decision"])


@router.post("/recommend-action", response_model=RecommendationResponse)
def recommend(payload: RecommendationRequest):
    return recommend_action(payload.state)

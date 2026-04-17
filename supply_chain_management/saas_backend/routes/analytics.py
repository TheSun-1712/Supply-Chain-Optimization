from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.domain import AnalyticsSeriesPoint, AnalyticsSummary, PerformanceScore
from ..services.analytics_service import action_distribution, get_summary, performance_over_time, profit_trends, task_scorecard

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def summary(db: Session = Depends(get_db)):
    return get_summary(db)


@router.get("/performance-over-time", response_model=list[AnalyticsSeriesPoint])
def performance(db: Session = Depends(get_db)):
    return performance_over_time(db)


@router.get("/action-distribution", response_model=list[AnalyticsSeriesPoint])
def actions(db: Session = Depends(get_db)):
    return action_distribution(db)


@router.get("/profit-trends", response_model=list[AnalyticsSeriesPoint])
def profits(db: Session = Depends(get_db)):
    return profit_trends(db)


@router.get("/scorecard", response_model=list[PerformanceScore])
def scorecard(db: Session = Depends(get_db)):
    return task_scorecard(db)

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database.models import SimulationRun, SimulationStep
from ..schemas.domain import AnalyticsSeriesPoint, AnalyticsSummary, PerformanceScore


def get_summary(db: Session) -> AnalyticsSummary:
    total_runs = db.scalar(select(func.count(SimulationRun.id))) or 0
    avg_profit = db.scalar(select(func.avg(SimulationRun.total_profit))) or 0.0
    avg_service = db.scalar(select(func.avg(SimulationRun.avg_service_level))) or 0.0
    avg_backlog = db.scalar(select(func.avg(SimulationRun.ending_backlog))) or 0.0
    return AnalyticsSummary(
        total_runs=int(total_runs),
        avg_profit=float(avg_profit),
        avg_service_level=float(avg_service),
        avg_backlog=float(avg_backlog),
    )


def performance_over_time(db: Session) -> list[AnalyticsSeriesPoint]:
    rows = db.execute(
        select(SimulationRun.created_at, SimulationRun.total_profit).order_by(SimulationRun.created_at.desc()).limit(12)
    ).all()
    return [AnalyticsSeriesPoint(label=row.created_at.strftime("%b %d"), value=float(row.total_profit)) for row in reversed(rows)]


def action_distribution(db: Session) -> list[AnalyticsSeriesPoint]:
    rows = db.execute(
        select(SimulationStep.action_type, func.count(SimulationStep.id)).group_by(SimulationStep.action_type)
    ).all()
    return [AnalyticsSeriesPoint(label=str(action), value=float(count)) for action, count in rows]


def profit_trends(db: Session) -> list[AnalyticsSeriesPoint]:
    rows = db.execute(
        select(SimulationStep.step_index, func.avg(SimulationStep.profit))
        .group_by(SimulationStep.step_index)
        .order_by(SimulationStep.step_index)
    ).all()
    return [AnalyticsSeriesPoint(label=f"Step {int(step)}", value=float(avg_profit)) for step, avg_profit in rows]


def task_scorecard(db: Session) -> list[PerformanceScore]:
    thresholds = {"easy": 1200.0, "medium": 2000.0, "hard": 2800.0}
    rows = db.execute(
        select(SimulationRun.task_id, func.avg(SimulationRun.total_profit)).group_by(SimulationRun.task_id)
    ).all()
    found = {task_id: avg_profit for task_id, avg_profit in rows}
    scores: list[PerformanceScore] = []
    for task_id in ("easy", "medium", "hard"):
        avg_profit = float(found.get(task_id, 0.0) or 0.0)
        score = max(0.0, min(100.0, (avg_profit / thresholds[task_id]) * 100.0))
        scores.append(PerformanceScore(task_id=task_id, score=round(score, 1)))
    return scores

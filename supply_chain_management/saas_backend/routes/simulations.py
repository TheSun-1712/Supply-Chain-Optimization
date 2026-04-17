from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..schemas.domain import PolicyComparisonRequest, PolicyComparisonResponse, SimulationRequest, SimulationResponse
from ..services.simulation_service import compare_policies, run_simulation

router = APIRouter(tags=["simulation"])


@router.post("/simulate", response_model=SimulationResponse)
def simulate(payload: SimulationRequest, db: Session = Depends(get_db)):
    return run_simulation(db, payload)


@router.post("/scenario-test", response_model=SimulationResponse)
def scenario_test(payload: SimulationRequest, db: Session = Depends(get_db)):
    return run_simulation(db, payload)


@router.post("/compare-policies", response_model=PolicyComparisonResponse)
def compare(payload: PolicyComparisonRequest, db: Session = Depends(get_db)):
    return compare_policies(db, payload.initial_state, payload.steps, payload.scenario)

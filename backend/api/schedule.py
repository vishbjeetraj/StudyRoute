import json
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

try:
    from ..models.syllabus import Syllabus
    from ..models.schedule import ScheduleConstraints, StudyPlan, StudySession
    from ..solver.scheduler import Scheduler
    from ..solver.graph import CircularDependencyError
except (ImportError, ValueError):
    from models.syllabus import Syllabus
    from models.schedule import ScheduleConstraints, StudyPlan, StudySession
    from solver.scheduler import Scheduler
    from solver.graph import CircularDependencyError

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])

DEMO_PLAN_PATH = Path(__file__).resolve().parent.parent / "data" / "demo_plan.json"

# In-memory storage for active plan
_current_active_plan: Optional[StudyPlan] = None


def get_stored_or_demo_plan() -> StudyPlan:
    global _current_active_plan
    if _current_active_plan:
        return _current_active_plan

    if DEMO_PLAN_PATH.exists():
        with open(DEMO_PLAN_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        _current_active_plan = StudyPlan.model_validate(data)
        return _current_active_plan

    raise HTTPException(status_code=404, detail="No active study plan found.")


class GenerateScheduleRequest(BaseModel):
    syllabus: Syllabus
    constraints: ScheduleConstraints
    completed_topics: Optional[List[str]] = Field(default_factory=list)


class UpdateSessionRequest(BaseModel):
    session_id: str
    status: str = Field(..., description="upcoming, in_progress, completed, missed")
    actual_minutes_spent: Optional[int] = None
    notes: Optional[str] = None


@router.post("/generate", response_model=StudyPlan)
async def generate_schedule(req: GenerateScheduleRequest):
    """
    Deterministically generate a study plan from syllabus and user constraints
    using the Python Graph Solver.
    """
    global _current_active_plan
    scheduler = Scheduler()

    try:
        plan = scheduler.build_schedule(
            syllabus=req.syllabus,
            constraints=req.constraints,
            completed_topics=set(req.completed_topics or []),
        )
        _current_active_plan = plan
        return plan
    except CircularDependencyError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Circular prerequisite dependency detected: {' -> '.join(e.cycle)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate schedule: {str(e)}"
        )


@router.get("", response_model=StudyPlan)
async def get_schedule():
    """Retrieve the current active study plan."""
    return get_stored_or_demo_plan()


@router.post("/update-session", response_model=StudyPlan)
async def update_session_status(req: UpdateSessionRequest):
    """Update study session state (e.g. mark completed, missed, or update duration)."""
    global _current_active_plan
    plan = get_stored_or_demo_plan()

    found = False
    for s in plan.sessions:
        if s.id == req.session_id:
            s.status = req.status
            if req.actual_minutes_spent is not None:
                s.actual_minutes_spent = req.actual_minutes_spent
            if req.notes is not None:
                s.notes = req.notes
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Session with ID '{req.session_id}' not found.")

    _current_active_plan = plan
    return plan

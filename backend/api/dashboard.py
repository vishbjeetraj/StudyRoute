import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from . import schedule as schedule_api
    from . import disruption as disruption_api
    from ..models.schedule import StudyPlan, StudySession
except (ImportError, ValueError):
    import api.schedule as schedule_api
    import api.disruption as disruption_api
    from models.schedule import StudyPlan, StudySession

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class SubjectProgress(BaseModel):
    subject: str
    completed_hours: float
    total_hours: float
    percentage: int
    completed_sessions: int
    total_sessions: int


class DashboardMetrics(BaseModel):
    overall_progress_percentage: int
    plan_health: str  # ON TRACK, NEEDS ATTENTION, AT RISK
    plan_health_reason: str
    current_streak_days: int
    total_hours_studied: float
    total_hours_remaining: float
    total_sessions_completed: int
    total_sessions_upcoming: int
    total_sessions_missed: int
    subject_progress: List[SubjectProgress]
    upcoming_deadlines: List[Dict[str, Any]]
    recent_reroutes: List[Dict[str, Any]]
    today_sessions: List[StudySession]


@router.get("", response_model=DashboardMetrics)
async def get_dashboard_metrics():
    """
    Compute live dashboard metrics deterministically from active study plan.
    No hardcoded random values.
    """
    plan = schedule_api.get_stored_or_demo_plan()
    today_iso = datetime.date.today().isoformat()

    # 1. Session Counts
    completed_sess = [s for s in plan.sessions if s.status == "completed"]
    missed_sess = [s for s in plan.sessions if s.status == "missed"]
    upcoming_sess = [s for s in plan.sessions if s.status in ("upcoming", "in_progress")]
    today_sessions = [s for s in plan.sessions if s.date == today_iso or (s.status == "upcoming" and not today_iso)]

    total_sessions = len(plan.sessions)
    completed_count = len(completed_sess)
    missed_count = len(missed_sess)
    upcoming_count = len(upcoming_sess)

    # 2. Hours calculation
    studied_minutes = sum(
        (s.actual_minutes_spent if s.actual_minutes_spent is not None else s.duration_minutes)
        for s in completed_sess
    )
    studied_hours = round(studied_minutes / 60.0, 1)

    remaining_minutes = sum(s.duration_minutes for s in upcoming_sess)
    remaining_hours = round(remaining_minutes / 60.0, 1)

    total_calc_hours = studied_hours + remaining_hours
    overall_pct = int((studied_hours / total_calc_hours * 100)) if total_calc_hours > 0 else 0

    # 3. Subject-wise Progress
    subjects = sorted(list({s.subject for s in plan.sessions}))
    subject_progress_list: List[SubjectProgress] = []

    for subj in subjects:
        subj_sessions = [s for s in plan.sessions if s.subject == subj]
        subj_done = [s for s in subj_sessions if s.status == "completed"]
        
        done_hrs = round(sum(s.duration_minutes for s in subj_done) / 60.0, 1)
        tot_hrs = round(sum(s.duration_minutes for s in subj_sessions) / 60.0, 1)
        pct = int((done_hrs / tot_hrs * 100)) if tot_hrs > 0 else 0

        subject_progress_list.append(
            SubjectProgress(
                subject=subj,
                completed_hours=done_hrs,
                total_hours=tot_hrs,
                percentage=pct,
                completed_sessions=len(subj_done),
                total_sessions=len(subj_sessions),
            )
        )

    # 4. Plan Health Calculation (Deterministic)
    if not plan.is_feasible or missed_count >= 3:
        plan_health = "AT RISK"
        plan_health_reason = (
            f"{missed_count} missed sessions detected or deadline constraints tight. Rerouting recommended."
            if missed_count >= 3
            else (plan.feasibility_message or "Study runway is insufficient.")
        )
    elif missed_count > 0 or (total_sessions > 0 and (completed_count / total_sessions < 0.15 and len(upcoming_sess) > 20)):
        plan_health = "NEEDS ATTENTION"
        plan_health_reason = f"{missed_count} session(s) pending attention. Pacing is slightly behind schedule."
    else:
        plan_health = "ON TRACK"
        plan_health_reason = "All sessions on schedule. Pacing is optimal to meet target exam deadlines."

    # 5. Streak Calculation
    completed_dates = sorted(list({s.date for s in completed_sess}))
    current_streak = 0
    if completed_dates:
        current_streak = 1
        for i in range(len(completed_dates) - 1, 0, -1):
            d2 = datetime.date.fromisoformat(completed_dates[i])
            d1 = datetime.date.fromisoformat(completed_dates[i - 1])
            if (d2 - d1).days == 1:
                current_streak += 1
            else:
                break

    # 6. Deadlines
    upcoming_deadlines = [
        {"title": f"{subj} Exam", "date": plan.end_date, "days_left": max(1, (datetime.date.fromisoformat(plan.end_date) - datetime.date.today()).days)}
        for subj in subjects[:3]
    ]

    return DashboardMetrics(
        overall_progress_percentage=overall_pct,
        plan_health=plan_health,
        plan_health_reason=plan_health_reason,
        current_streak_days=current_streak,
        total_hours_studied=studied_hours,
        total_hours_remaining=remaining_hours,
        total_sessions_completed=completed_count,
        total_sessions_upcoming=upcoming_count,
        total_sessions_missed=missed_count,
        subject_progress=subject_progress_list,
        upcoming_deadlines=upcoming_deadlines,
        recent_reroutes=disruption_api.get_reroute_history(),
        today_sessions=today_sessions,
    )

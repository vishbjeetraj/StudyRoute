from typing import List, Optional
from pydantic import BaseModel, Field


class ScheduleConstraints(BaseModel):
    available_daily_hours: float = Field(3.0, gt=0, le=16, description="Hours available per study day")
    preferred_time: str = Field("afternoon", description="Preferred time slot: morning, afternoon, evening, flexible")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    rest_days: List[int] = Field(default_factory=lambda: [6], description="Rest days: 0=Mon, 1=Tue, ..., 6=Sun")
    max_session_minutes: int = Field(90, ge=30, le=180, description="Max continuous session chunk in minutes")


class StudySession(BaseModel):
    id: str = Field(..., description="Unique session ID")
    subject: str = Field(..., description="Subject name")
    topic_id: str = Field(..., description="Topic identifier")
    topic_name: str = Field(..., description="Topic display name")
    date: str = Field(..., description="Scheduled date in YYYY-MM-DD format")
    start_time: str = Field("14:00", description="Scheduled start time HH:MM")
    end_time: str = Field("15:30", description="Scheduled end time HH:MM")
    duration_minutes: int = Field(..., gt=0, description="Session duration in minutes")
    difficulty: str = Field("medium", description="Topic difficulty")
    status: str = Field("upcoming", description="Session status: upcoming, in_progress, completed, missed")
    session_type: str = Field("study", description="Session type: study, review, coursework")
    actual_minutes_spent: Optional[int] = Field(None, description="Actual minutes studied if recorded")
    notes: Optional[str] = Field(None, description="User or algorithm notes")


class StudyPlan(BaseModel):
    id: str = Field(..., description="Unique study plan identifier")
    created_at: str = Field(..., description="Timestamp of creation")
    start_date: str = Field(..., description="Plan start date YYYY-MM-DD")
    end_date: str = Field(..., description="Plan completion date YYYY-MM-DD")
    total_hours: float = Field(..., ge=0, description="Total hours across all planned sessions")
    total_sessions: int = Field(..., ge=0, description="Total number of sessions")
    sessions: List[StudySession] = Field(default_factory=list, description="Ordered list of study sessions")
    constraints: ScheduleConstraints = Field(..., description="Constraints used to build schedule")
    is_feasible: bool = Field(True, description="Whether syllabus can be completed before deadlines")
    feasibility_message: Optional[str] = Field(None, description="Warning if study time is tight or insufficient")

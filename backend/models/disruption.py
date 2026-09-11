from typing import List, Optional
from pydantic import BaseModel, Field
from .schedule import StudyPlan, StudySession
from .syllabus import Syllabus


class DisruptionRequest(BaseModel):
    disruption_type: str = Field(..., description="Type of disruption: missed_session, topic_took_longer, changed_exam_date, new_coursework")
    # For missed_session
    session_id: Optional[str] = Field(None, description="ID of the missed session")
    # For topic_took_longer
    topic_id: Optional[str] = Field(None, description="Topic ID that required extra duration")
    extra_minutes: Optional[int] = Field(None, description="Additional minutes needed beyond original estimate")
    # For changed_exam_date
    subject: Optional[str] = Field(None, description="Subject whose exam date changed")
    new_exam_date: Optional[str] = Field(None, description="New exam date in YYYY-MM-DD format")
    # For new_coursework
    new_topic_name: Optional[str] = Field(None, description="Name of new coursework or assignment")
    estimated_hours: Optional[float] = Field(None, description="Estimated hours for new coursework")
    difficulty: Optional[str] = Field("medium", description="Difficulty of new coursework")
    deadline_date: Optional[str] = Field(None, description="Deadline date for new coursework YYYY-MM-DD")
    prerequisites: Optional[List[str]] = Field(default_factory=list, description="Prerequisite topic IDs for new coursework")
    # Full context for deterministic recalculation
    current_plan: StudyPlan = Field(..., description="Current active study plan")
    syllabus: Syllabus = Field(..., description="Current syllabus data")


class SessionDiff(BaseModel):
    session_id: str
    topic_name: str
    subject: str
    diff_type: str = Field(..., description="Diff status: moved, changed, unchanged, new")
    old_date: Optional[str] = None
    new_date: Optional[str] = None
    old_duration: Optional[int] = None
    new_duration: Optional[int] = None
    change_reason: Optional[str] = None


class RerouteExplanation(BaseModel):
    what_changed: str = Field(..., description="Summary of changes made to the plan")
    why: str = Field(..., description="Algorithmic justification for the recalculation")
    what_stayed_the_same: str = Field(..., description="Preserved sessions and constraints")


class RerouteResponse(BaseModel):
    old_plan: StudyPlan
    new_plan: StudyPlan
    diffs: List[SessionDiff]
    explanation: RerouteExplanation
    moved_count: int
    changed_count: int
    unchanged_count: int
    new_count: int

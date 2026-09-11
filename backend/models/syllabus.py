from typing import List, Optional
from pydantic import BaseModel, Field


class Topic(BaseModel):
    id: str = Field(..., description="Unique slug or identifier for the topic")
    name: str = Field(..., description="Human-readable title of the topic")
    difficulty: str = Field("medium", description="Difficulty level: easy, medium, or hard")
    estimated_hours: float = Field(..., gt=0, description="Estimated study duration in hours")
    prerequisites: List[str] = Field(default_factory=list, description="IDs of topic prerequisites")
    unit: Optional[str] = Field(None, description="Optional unit or module name")
    completed: bool = Field(False, description="Whether topic is already completed")
    description: Optional[str] = Field(None, description="Short student-friendly explanation of what this topic is")
    why_it_matters: Optional[str] = Field(None, description="Why this topic matters in the course or industry")
    importance: Optional[str] = Field("medium", description="Priority/importance level: high, medium, or low")
    recommended_order: Optional[int] = Field(None, description="Suggested linear learning order")


class Subject(BaseModel):
    id: Optional[str] = Field(None, description="Optional subject identifier")
    name: str = Field(..., description="Subject name (e.g. Java, Operating Systems)")
    summary: Optional[str] = Field(None, description="Executive summary of this subject and its units")
    estimated_total_hours: Optional[float] = Field(None, description="Total study hours across all topics")
    topics: List[Topic] = Field(default_factory=list, description="Topics belonging to this subject")


class ExamDate(BaseModel):
    subject: str = Field(..., description="Name of the subject")
    exam_date: str = Field(..., description="Exam date in YYYY-MM-DD format")


class CourseworkDeadline(BaseModel):
    title: str = Field(..., description="Assignment or coursework title")
    subject: str = Field(..., description="Related subject")
    deadline_date: str = Field(..., description="Deadline date in YYYY-MM-DD format")
    estimated_hours: float = Field(2.0, gt=0, description="Estimated hours required")


class OverallAnalysis(BaseModel):
    total_topics: int = Field(0, description="Total number of extracted topics")
    estimated_hours: float = Field(0.0, description="Total estimated study hours")
    easy_topics: int = Field(0, description="Count of foundational easy topics")
    medium_topics: int = Field(0, description="Count of core medium topics")
    hard_topics: int = Field(0, description="Count of complex hard topics")


class StudyGuidance(BaseModel):
    recommended_strategy: str = Field("", description="AI recommended study strategy")
    high_priority_topics: List[str] = Field(default_factory=list, description="List of high priority topic names")
    topics_requiring_prerequisites: List[str] = Field(default_factory=list, description="Topics with deep dependencies")
    potentially_difficult_areas: List[str] = Field(default_factory=list, description="Units or topics requiring extra focus")


class Syllabus(BaseModel):
    syllabus_title: Optional[str] = Field("Academic Syllabus", description="Title of the syllabus")
    summary: Optional[str] = Field(None, description="High-level summary of the entire curriculum")
    subjects: List[Subject] = Field(default_factory=list, description="List of subjects in syllabus")
    exam_dates: List[ExamDate] = Field(default_factory=list, description="Scheduled exam dates")
    coursework_deadlines: List[CourseworkDeadline] = Field(default_factory=list, description="Upcoming coursework deadlines")
    overall_analysis: Optional[OverallAnalysis] = Field(default_factory=OverallAnalysis, description="Quantitative analysis")
    study_guidance: Optional[StudyGuidance] = Field(default_factory=StudyGuidance, description="Personalized AI study guidance")

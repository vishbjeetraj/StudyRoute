import datetime
import pytest
from ..models.syllabus import Syllabus, Subject, Topic, ExamDate
from ..models.schedule import ScheduleConstraints
from ..solver.scheduler import Scheduler


@pytest.fixture
def sample_syllabus():
    return Syllabus(
        subjects=[
            Subject(
                name="Computer Science",
                topics=[
                    Topic(id="cs-intro", name="CS Intro", difficulty="easy", estimated_hours=2.0),
                    Topic(id="cs-oop", name="OOP", difficulty="medium", estimated_hours=3.0, prerequisites=["cs-intro"]),
                    Topic(id="cs-dsa", name="Data Structures", difficulty="hard", estimated_hours=4.0, prerequisites=["cs-oop"]),
                ]
            )
        ],
        exam_dates=[
            ExamDate(subject="Computer Science", exam_date="2026-10-30")
        ]
    )


def test_scheduler_deterministic_output(sample_syllabus):
    constraints = ScheduleConstraints(
        available_daily_hours=3.0,
        preferred_time="afternoon",
        start_date="2026-09-15",
        rest_days=[6],  # Sunday
        max_session_minutes=90,
    )

    scheduler = Scheduler()
    plan_1 = scheduler.build_schedule(sample_syllabus, constraints)
    plan_2 = scheduler.build_schedule(sample_syllabus, constraints)

    # Identical session counts and metadata
    assert plan_1.total_sessions == plan_2.total_sessions
    assert plan_1.total_hours == plan_2.total_hours
    assert plan_1.start_date == plan_2.start_date
    assert plan_1.end_date == plan_2.end_date

    # Compare session by session
    for s1, s2 in zip(plan_1.sessions, plan_2.sessions):
        assert s1.topic_id == s2.topic_id
        assert s1.date == s2.date
        assert s1.start_time == s2.start_time
        assert s1.duration_minutes == s2.duration_minutes


def test_prerequisite_ordering_respected(sample_syllabus):
    constraints = ScheduleConstraints(
        available_daily_hours=2.0,
        preferred_time="morning",
        start_date="2026-09-15",
        rest_days=[6],
        max_session_minutes=90,
    )
    scheduler = Scheduler()
    plan = scheduler.build_schedule(sample_syllabus, constraints)

    intro_dates = [s.date for s in plan.sessions if s.topic_id == "cs-intro"]
    oop_dates = [s.date for s in plan.sessions if s.topic_id == "cs-oop"]
    dsa_dates = [s.date for s in plan.sessions if s.topic_id == "cs-dsa"]

    # All intro sessions must finish on or before first OOP session
    assert max(intro_dates) <= min(oop_dates)
    # All OOP sessions must finish on or before first DSA session
    assert max(oop_dates) <= min(dsa_dates)


def test_rest_days_respected(sample_syllabus):
    # Sunday is rest day (6)
    constraints = ScheduleConstraints(
        available_daily_hours=3.0,
        preferred_time="afternoon",
        start_date="2026-09-15",
        rest_days=[6],
        max_session_minutes=90,
    )
    scheduler = Scheduler()
    plan = scheduler.build_schedule(sample_syllabus, constraints)

    for session in plan.sessions:
        dt = datetime.date.fromisoformat(session.date)
        assert dt.weekday() != 6, f"Session {session.id} scheduled on a rest day (Sunday)!"


def test_feasibility_warning_when_deadline_impossible():
    tight_syllabus = Syllabus(
        subjects=[
            Subject(
                name="Physics",
                topics=[
                    Topic(id="p-1", name="Quantum Mechanics", difficulty="hard", estimated_hours=20.0),
                ]
            )
        ],
        exam_dates=[
            # Exam is tomorrow, but topic needs 20 hours and daily capacity is only 2 hours!
            ExamDate(subject="Physics", exam_date="2026-09-16")
        ]
    )
    constraints = ScheduleConstraints(
        available_daily_hours=2.0,
        preferred_time="morning",
        start_date="2026-09-15",
        rest_days=[],
        max_session_minutes=90,
    )
    scheduler = Scheduler()
    plan = scheduler.build_schedule(tight_syllabus, constraints)

    assert plan.is_feasible is False
    assert "insufficient" in plan.feasibility_message.lower()

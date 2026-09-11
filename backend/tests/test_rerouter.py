import pytest
from ..models.syllabus import Syllabus, Subject, Topic, ExamDate
from ..models.schedule import ScheduleConstraints
from ..models.disruption import DisruptionRequest
from ..solver.scheduler import Scheduler
from ..solver.rerouter import Rerouter


@pytest.fixture
def initial_setup():
    syllabus = Syllabus(
        subjects=[
            Subject(
                name="Java",
                topics=[
                    Topic(id="j-1", name="Java Syntax", difficulty="easy", estimated_hours=2.0),
                    Topic(id="j-2", name="Java OOP", difficulty="medium", estimated_hours=3.0, prerequisites=["j-1"]),
                    Topic(id="j-3", name="Java Collections", difficulty="hard", estimated_hours=4.0, prerequisites=["j-2"]),
                ]
            )
        ],
        exam_dates=[
            ExamDate(subject="Java", exam_date="2026-10-25")
        ]
    )
    constraints = ScheduleConstraints(
        available_daily_hours=2.0,
        preferred_time="afternoon",
        start_date="2026-09-15",
        rest_days=[6],
        max_session_minutes=60,
    )
    plan = Scheduler().build_schedule(syllabus, constraints)
    return syllabus, constraints, plan


def test_reroute_missed_session(initial_setup):
    syllabus, constraints, plan = initial_setup

    # Mark first session as completed
    plan.sessions[0].status = "completed"
    plan.sessions[0].actual_minutes_spent = 60

    # Target second session as missed
    missed_sess_id = plan.sessions[1].id

    req = DisruptionRequest(
        disruption_type="missed_session",
        session_id=missed_sess_id,
        current_plan=plan,
        syllabus=syllabus,
    )

    rerouter = Rerouter()
    resp = rerouter.generate_new_plan(req)

    # 1. First session is preserved as completed
    assert resp.new_plan.sessions[0].status == "completed"
    assert resp.new_plan.sessions[0].id == plan.sessions[0].id

    # 2. Marked missed session exists
    missed_in_new = [s for s in resp.new_plan.sessions if s.status == "missed"]
    assert len(missed_in_new) == 1
    assert missed_in_new[0].id == missed_sess_id

    # 3. Diffs reflect the change
    assert resp.changed_count >= 1
    assert "Rescheduled missed session" in resp.explanation.what_changed


def test_reroute_topic_took_longer(initial_setup):
    syllabus, constraints, plan = initial_setup

    req = DisruptionRequest(
        disruption_type="topic_took_longer",
        topic_id="j-1",
        extra_minutes=60,  # Took 1 hour extra
        current_plan=plan,
        syllabus=syllabus,
    )

    rerouter = Rerouter()
    resp = rerouter.generate_new_plan(req)

    # Total hours should increase by 1.0
    assert resp.new_plan.total_hours >= plan.total_hours + 0.9
    assert resp.moved_count > 0 or resp.changed_count > 0
    assert "Allocated 60 additional minutes" in resp.explanation.what_changed


def test_reroute_changed_exam_date(initial_setup):
    syllabus, constraints, plan = initial_setup

    req = DisruptionRequest(
        disruption_type="changed_exam_date",
        subject="Java",
        new_exam_date="2026-09-22",  # Moved much earlier!
        current_plan=plan,
        syllabus=syllabus,
    )

    rerouter = Rerouter()
    resp = rerouter.generate_new_plan(req)

    assert "Java" in resp.explanation.what_changed
    assert resp.diffs is not None


def test_reroute_new_coursework(initial_setup):
    syllabus, constraints, plan = initial_setup

    req = DisruptionRequest(
        disruption_type="new_coursework",
        subject="Java",
        new_topic_name="Spring Boot Microservices Lab",
        estimated_hours=3.0,
        difficulty="hard",
        deadline_date="2026-10-10",
        prerequisites=["j-2"],
        current_plan=plan,
        syllabus=syllabus,
    )

    rerouter = Rerouter()
    resp = rerouter.generate_new_plan(req)

    # Total sessions increased
    assert resp.new_plan.total_sessions > plan.total_sessions
    assert resp.new_count > 0
    assert any("Spring Boot" in s.topic_name for s in resp.new_plan.sessions)

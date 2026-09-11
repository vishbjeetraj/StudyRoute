import pytest
from fastapi.testclient import TestClient
from ..main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "StudyRoute" in data["service"]


def test_api_syllabus_sample():
    response = client.get("/api/syllabus/sample")
    assert response.status_code == 200
    data = response.json()
    assert "subjects" in data
    assert len(data["subjects"]) >= 1
    # Check subjects contain topics
    first_subj = data["subjects"][0]
    assert "topics" in first_subj
    assert len(first_subj["topics"]) >= 1


def test_api_schedule_generate_and_get():
    # 1. Fetch sample syllabus
    sample_res = client.get("/api/syllabus/sample")
    syllabus = sample_res.json()

    # 2. Generate schedule
    payload = {
        "syllabus": syllabus,
        "constraints": {
            "available_daily_hours": 3.0,
            "preferred_time": "afternoon",
            "start_date": "2026-09-15",
            "rest_days": [6],
            "max_session_minutes": 90
        }
    }
    gen_res = client.post("/api/schedule/generate", json=payload)
    assert gen_res.status_code == 200
    plan = gen_res.json()
    assert plan["total_sessions"] > 0
    assert len(plan["sessions"]) > 0

    # 3. GET /api/schedule
    get_res = client.get("/api/schedule")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == plan["id"]


def test_api_dashboard_metrics():
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "overall_progress_percentage" in data
    assert "plan_health" in data
    assert data["plan_health"] in ("ON TRACK", "NEEDS ATTENTION", "AT RISK")
    assert "subject_progress" in data
    assert "current_streak_days" in data

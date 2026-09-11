import pytest
from fastapi.testclient import TestClient
from main import app
from services.local_parser import LocalSyllabusParser
from models.syllabus import Syllabus, OverallAnalysis, StudyGuidance

client = TestClient(app)

OS_TEXT = """
COURSE SYLLABUS: OPERATING SYSTEMS
Unit 1: Process Concepts & Scheduling
- Operating System Overview and Architecture (2 hours)
- Process State Transitions and PCBs (3 hours)
- CPU Scheduling Algorithms: FCFS, SJF, Round Robin (4 hours)

Unit 2: Memory Management & Virtual Memory
- Swapping and Contiguous Memory Allocation (3 hours)
- Paging and Segmentation Mechanisms (4 hours)
- Virtual Memory and Page Faults (4 hours)
"""

DBMS_TEXT = """
COURSE SYLLABUS: DATABASE SYSTEMS
Unit 1: Relational Architecture & SQL
- Relational Data Model and Schemas (2 hours)
- Structured Query Language and Joins (4 hours)

Unit 2: Normalization and Transactions
- Functional Dependencies and 1NF to BCNF (5 hours)
- ACID Properties and Concurrency Control (4 hours)
"""


def test_ai_understanding_fields_populated():
    syllabus = LocalSyllabusParser.parse(OS_TEXT)
    assert syllabus.syllabus_title is not None
    assert "Operating Systems" in syllabus.syllabus_title
    assert syllabus.summary is not None
    assert syllabus.overall_analysis is not None
    assert syllabus.overall_analysis.total_topics >= 6
    assert syllabus.overall_analysis.estimated_hours > 15
    assert syllabus.study_guidance is not None
    assert len(syllabus.study_guidance.recommended_strategy) > 20

    first_topic = syllabus.subjects[0].topics[0]
    assert first_topic.description is not None
    assert first_topic.why_it_matters is not None
    assert first_topic.importance in ["high", "medium", "low"]


def test_syllabus_qna_locally():
    syllabus = LocalSyllabusParser.parse(OS_TEXT)

    ans_first = LocalSyllabusParser.answer_question_locally(syllabus, "What should I study first?")
    assert "Operating System" in ans_first or "Process" in ans_first or "first" in ans_first.lower()

    ans_hard = LocalSyllabusParser.answer_question_locally(syllabus, "Which topics are difficult?")
    assert "challenging" in ans_hard.lower() or "focus" in ans_hard.lower()

    ans_hours = LocalSyllabusParser.answer_question_locally(syllabus, "How many hours will I need?")
    assert "hours" in ans_hours.lower()


def test_ask_endpoint():
    syllabus = LocalSyllabusParser.parse(OS_TEXT)
    payload = {
        "syllabus": syllabus.model_dump(),
        "question": "What should I study first?"
    }
    response = client.post("/api/syllabus/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 10


def test_two_distinct_syllabi_have_distinct_ai_understanding():
    os_syl = LocalSyllabusParser.parse(OS_TEXT)
    dbms_syl = LocalSyllabusParser.parse(DBMS_TEXT)

    assert os_syl.syllabus_title != dbms_syl.syllabus_title
    assert os_syl.summary != dbms_syl.summary
    assert os_syl.overall_analysis.total_topics != dbms_syl.overall_analysis.total_topics

    os_topics = [t.name.lower() for t in os_syl.subjects[0].topics]
    dbms_topics = [t.name.lower() for t in dbms_syl.subjects[0].topics]

    assert any("process" in t for t in os_topics)
    assert not any("process" in t for t in dbms_topics)
    assert any("sql" in t or "relational" in t for t in dbms_topics)
    assert not any("sql" in t for t in os_topics)

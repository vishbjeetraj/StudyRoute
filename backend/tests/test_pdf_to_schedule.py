import pytest
import io
import fitz
from services.local_parser import LocalSyllabusParser
from services.pdf_parser import PDFParser, ScannedPDFError
from solver.scheduler import Scheduler
from models.schedule import ScheduleConstraints

OS_SYLLABUS_TEXT = """
COURSE SYLLABUS: OPERATING SYSTEMS (CS 401)
Department of Computer Science

UNIT 1: INTRODUCTION & PROCESS MANAGEMENT
- Overview of Operating Systems and System Calls (2 hours)
- Process Concept, Process Control Blocks, and State Transitions (3 hours)
- CPU Scheduling Algorithms: FCFS, SJF, Round Robin, Multi-Level Feedback (4 hours)
- Inter-process Communication and Shared Memory (3 hours)

UNIT 2: SYNCHRONIZATION & DEADLOCKS
- Critical Section Problem and Peterson's Solution (3 hours)
- Semaphores and Mutex Locks (3 hours)
- Deadlock Characterization and Bankers Algorithm (4 hours)

UNIT 3: MEMORY MANAGEMENT
- Logical vs Physical Address Space and Swapping (3 hours)
- Paging, Segmentation, and Page Replacement Algorithms (4 hours)
- Virtual Memory and Working Set Model (3 hours)

Final Exam: Dec 15, 2026
Coursework: OS Kernel Simulator Project
"""

DBMS_SYLLABUS_TEXT = """
COURSE SYLLABUS: DATABASE MANAGEMENT SYSTEMS (CS 402)

UNIT 1: RELATIONAL MODEL & SQL
- Relational Model Concepts and Relational Algebra (3 hours)
- Advanced SQL Queries, Joins, and Subqueries (4 hours)
- Views, Constraints, and Triggers (3 hours)

UNIT 2: DATABASE DESIGN & NORMALIZATION
- Functional Dependencies and Normal Forms (1NF, 2NF, 3NF, BCNF) (5 hours)
- Multi-valued Dependencies and 4NF (3 hours)

UNIT 3: TRANSACTION PROCESSING & CONCURRENCY
- ACID Properties and Transaction States (3 hours)
- Concurrency Control: Two Phase Locking and Timestamp Ordering (4 hours)
- B+ Tree Indexing and Query Optimization (4 hours)

Midterm Examination: Nov 20, 2026
Coursework: E-commerce Database Schema Design
"""


def create_pdf_bytes_from_text(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text, fontsize=10)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_local_parser_extracts_os_syllabus():
    syllabus = LocalSyllabusParser.parse(OS_SYLLABUS_TEXT)
    assert len(syllabus.subjects) == 1
    subject = syllabus.subjects[0]
    assert "Operating Systems" in subject.name
    assert len(subject.topics) >= 8

    topic_names = [t.name.lower() for t in subject.topics]
    assert any("process" in name or "scheduling" in name for name in topic_names)
    assert any("deadlock" in name or "synchronization" in name for name in topic_names)
    assert any("paging" in name or "memory" in name for name in topic_names)


def test_local_parser_extracts_dbms_syllabus():
    syllabus = LocalSyllabusParser.parse(DBMS_SYLLABUS_TEXT)
    assert len(syllabus.subjects) == 1
    subject = syllabus.subjects[0]
    assert "Database" in subject.name
    assert len(subject.topics) >= 7

    topic_names = [t.name.lower() for t in subject.topics]
    assert any("sql" in name or "relational" in name for name in topic_names)
    assert any("normalization" in name or "normal forms" in name for name in topic_names)
    assert any("transaction" in name or "acid" in name or "concurrency" in name for name in topic_names)


def test_distinct_syllabi_produce_completely_different_schedules():
    os_syllabus = LocalSyllabusParser.parse(OS_SYLLABUS_TEXT)
    dbms_syllabus = LocalSyllabusParser.parse(DBMS_SYLLABUS_TEXT)

    constraints = ScheduleConstraints(
        available_daily_hours=3.0,
        start_date="2026-10-01",
        preferred_time="afternoon",
        rest_days=[6],
        max_session_minutes=90
    )

    scheduler = Scheduler()
    os_schedule = scheduler.build_schedule(os_syllabus, constraints)
    dbms_schedule = scheduler.build_schedule(dbms_syllabus, constraints)

    # Verify session topics are completely distinct
    os_topics = {s.topic_id for s in os_schedule.sessions}
    dbms_topics = {s.topic_id for s in dbms_schedule.sessions}

    # Zero overlap between distinct courseware
    assert len(os_topics.intersection(dbms_topics)) == 0
    assert len(os_schedule.sessions) > 0
    assert len(dbms_schedule.sessions) > 0


def test_scanned_image_pdf_detection():
    # Empty PDF with 0 characters
    doc = fitz.open()
    doc.new_page()  # Blank page
    blank_bytes = doc.tobytes()
    doc.close()

    with pytest.raises(ScannedPDFError):
        PDFParser.extract_text_from_bytes(blank_bytes)


def test_pdf_extraction_and_end_to_end_parse():
    pdf_bytes = create_pdf_bytes_from_text(OS_SYLLABUS_TEXT)
    text = PDFParser.extract_text_from_bytes(pdf_bytes)
    assert len(text) > 100

    syllabus = LocalSyllabusParser.parse(text)
    assert len(syllabus.subjects[0].topics) > 0

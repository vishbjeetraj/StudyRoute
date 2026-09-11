import pytest
from services.pdf_parser import PDFParser
from services.local_parser import LocalSyllabusParser
from solver.graph import TopicGraph
from solver.scheduler import Scheduler
from models.schedule import ScheduleConstraints
from models.syllabus import Topic, Subject, Syllabus

NOISY_PDF_TEXT = """
COURSE SYLLABUS: OPERATING SYSTEMS (CS 401)
This is a single concatenated file suitable for printing or saving as a PDF.
This module is also available as a concatenated page.
missing content pages
Office hours: 7:00-8:30 PM ET
00-8-30-pm-et
Click here to download PDF
All rights reserved Copyright 2026

UNIT 1: PROCESS MANAGEMENT
- Overview of Process Management and Lifecycle (3 hours)
- CPU Scheduling Algorithms: Round Robin and Priority (4 hours)
- CPU Scheduling Concepts (3 hours)
- Process Synchronization and Critical Section (3 hours)

UNIT 2: DEADLOCKS & MEMORY
- Deadlock Characterization and Bankers Algorithm (4 hours)
- Memory Management and Virtual Memory Paging (4 hours)

Assignment 5 due Tuesday
April 15
Chapter 12
"""


def test_pdf_text_cleaner_strips_boilerplate():
    raw_pages = [
        [
            "Course Syllabus: Operating Systems",
            "This is a single concatenated file suitable for printing or saving as a PDF.",
            "missing content pages",
            "Page 1 of 5",
            "Unit 1: Process Management",
            "- Process Management (3 hours)",
            "All rights reserved Copyright 2026"
        ]
    ]
    cleaned = PDFParser.clean_text(raw_pages)
    assert "concatenated file" not in cleaned.lower()
    assert "missing content" not in cleaned.lower()
    assert "suitable for printing" not in cleaned.lower()
    assert "Process Management" in cleaned


def test_local_parser_rejects_garbage_topics():
    syllabus = LocalSyllabusParser.parse(NOISY_PDF_TEXT)
    topic_names = [t.name.lower() for t in syllabus.subjects[0].topics]

    # Verified that none of the noise became topics
    assert not any("this is a single" in name for name in topic_names)
    assert not any("concatenated file" in name for name in topic_names)
    assert not any("suitable for printing" in name for name in topic_names)
    assert not any("missing content" in name for name in topic_names)
    assert not any("8-30-pm-et" in name for name in topic_names)
    assert not any("00-8-30" in name for name in topic_names)
    assert not any("april 15" in name for name in topic_names)
    assert not any("assignment 5" in name for name in topic_names)

    # Verified genuine topics exist
    assert any("process management" in name for name in topic_names)
    assert any("cpu scheduling" in name for name in topic_names)
    assert any("deadlock" in name for name in topic_names)
    assert any("virtual memory" in name or "memory management" in name for name in topic_names)


def test_cycle_resolution_in_graph_and_scheduler():
    # Intentionally construct a cyclic graph A -> B -> C -> A
    graph = TopicGraph()
    t_a = Topic(id="topic-a", name="Topic A", difficulty="easy", estimated_hours=2.0)
    t_b = Topic(id="topic-b", name="Topic B", difficulty="medium", estimated_hours=2.0)
    t_c = Topic(id="topic-c", name="Topic C", difficulty="hard", estimated_hours=2.0)

    graph.add_topic(t_a)
    graph.add_topic(t_b)
    graph.add_topic(t_c)

    graph.add_dependency("topic-a", "topic-b")
    graph.add_dependency("topic-b", "topic-c")
    graph.add_dependency("topic-c", "topic-a")  # Circular back-edge!

    # Verify cycle detected
    cycle = graph.detect_cycles()
    assert cycle is not None
    assert len(cycle) >= 3

    # Safe resolution without crashing
    warnings = graph.resolve_cycles()
    assert len(warnings) >= 1
    assert graph.detect_cycles() is None

    # Topological sort must succeed now
    order = graph.topological_sort()
    assert len(order) == 3
    assert set(order) == {"topic-a", "topic-b", "topic-c"}

    # Test scheduler handling
    syllabus = Syllabus(
        subjects=[Subject(name="Operating Systems", topics=[t_a, t_b, t_c])]
    )
    # Give t_c a circular prerequisite pointing back to t_a
    t_b.prerequisites = ["topic-a"]
    t_c.prerequisites = ["topic-b"]
    t_a.prerequisites = ["topic-c"]  # Cycle!

    constraints = ScheduleConstraints(
        available_daily_hours=3.0,
        start_date="2026-10-01",
        preferred_time="afternoon",
        rest_days=[6],
        max_session_minutes=90
    )
    scheduler = Scheduler()
    plan = scheduler.build_schedule(syllabus, constraints)
    assert plan is not None
    assert len(plan.sessions) > 0
    assert "Notice: Resolved" in plan.feasibility_message

import datetime
from typing import Dict, List, Optional, Set, Tuple
import uuid

try:
    from ..models.syllabus import Syllabus, Topic
    from ..models.schedule import ScheduleConstraints, StudyPlan, StudySession
    from .graph import TopicGraph, CircularDependencyError
except (ImportError, ValueError):
    from models.syllabus import Syllabus, Topic
    from models.schedule import ScheduleConstraints, StudyPlan, StudySession
    from solver.graph import TopicGraph, CircularDependencyError


class Scheduler:
    """
    Deterministic Graph-Based Scheduler for StudyRoute.
    Assigns study sessions along a timeline honoring:
    - Topic prerequisite dependencies (topological order)
    - Daily available hours and rest days
    - Preferred time slots
    - Multi-factor priority scoring (deadlines, bottlenecks, difficulty, duration)
    - Topic chunking into manageable session lengths
    """

    def __init__(self):
        # Time slot presets
        self.slot_times = {
            "morning": "09:00",
            "afternoon": "14:00",
            "evening": "18:00",
            "flexible": "10:00",
        }

    def build_schedule(
        self,
        syllabus: Syllabus,
        constraints: ScheduleConstraints,
        completed_topics: Optional[Set[str]] = None,
        plan_id: Optional[str] = None,
    ) -> StudyPlan:
        """
        Deterministically generate a study plan from a syllabus and constraints.
        """
        if completed_topics is None:
            completed_topics = set()

        # 1. Build Topic Graph
        graph = TopicGraph()
        topic_map: Dict[str, Topic] = {}
        subject_map: Dict[str, str] = {}
        
        # Build exam date lookup
        exam_lookup: Dict[str, str] = {e.subject: e.exam_date for e in syllabus.exam_dates}
        # Build coursework deadline lookup (topic or subject)
        deadline_lookup: Dict[str, str] = {c.title: c.deadline_date for c in syllabus.coursework_deadlines}

        for subject in syllabus.subjects:
            for topic in subject.topics:
                # Mark completed if in set
                if topic.id in completed_topics:
                    topic.completed = True
                topic_map[topic.id] = topic
                subject_map[topic.id] = subject.name
                graph.add_topic(
                    topic=topic,
                    subject_name=subject.name,
                    exam_date=exam_lookup.get(subject.name),
                )

        # Add prerequisite edges
        for subject in syllabus.subjects:
            for topic in subject.topics:
                for prereq_id in topic.prerequisites:
                    if prereq_id in graph.nodes:
                        graph.add_dependency(prereq_id, topic.id)

        # Safely resolve any circular dependencies before computing topological order
        cycle_warnings = graph.resolve_cycles()

        # 2. Get Topological Order
        topo_order = graph.topological_sort()
        levels = graph.get_dependency_levels()

        # 3. Calculate Transparent Priority Scores for Pending Topics
        # Priority = w_deadline * urgency + w_dep * downstream_bottlenecks + w_diff * diff + w_dur * duration
        today = datetime.date.fromisoformat(constraints.start_date)
        
        def calculate_priority(topic_id: str) -> float:
            node = graph.nodes[topic_id]
            if node.completed:
                return -1000.0  # Already completed

            # A. Deadline Urgency
            urgency_score = 0.0
            if node.exam_date:
                try:
                    exam_d = datetime.date.fromisoformat(node.exam_date)
                    days_until = max((exam_d - today).days, 1)
                    # Closer deadline = higher score (normalized 0 to 40)
                    urgency_score = max(0.0, 40.0 - min(days_until, 40))
                except ValueError:
                    pass

            # B. Downstream Dependency Bottleneck Weight
            dependents_count = graph.get_transitive_dependents_count(topic_id)
            dep_score = dependents_count * 5.0  # 5 points per downstream topic unblocked

            # C. Difficulty Weight
            diff_weights = {"hard": 15.0, "medium": 10.0, "easy": 5.0}
            diff_score = diff_weights.get(node.difficulty, 10.0)

            # D. Duration Weight (longer topics scheduled with respect to size)
            dur_score = min(node.estimated_hours * 2.0, 10.0)

            # E. Level Priority: Lower topological level must come first
            # We subtract level penalty so level 0 is prioritized over level 1
            level_penalty = levels.get(topic_id, 0) * 20.0

            total_priority = urgency_score + dep_score + diff_score + dur_score - level_penalty
            return total_priority

        # Sort remaining topics deterministically by topological readiness and priority
        # We simulate day-by-day scheduling with an active ready queue
        ready_queue: List[str] = []
        in_degree = {k: len(graph.reverse_adj.get(k, set())) for k in graph.nodes}
        
        # Consider completed topics as satisfied dependencies
        for c_id in completed_topics:
            if c_id in graph.adj:
                for neighbor in graph.adj[c_id]:
                    if neighbor in in_degree:
                        in_degree[neighbor] = max(0, in_degree[neighbor] - 1)

        # Unfulfilled pending topics
        pending_topics = [t_id for t_id in topo_order if t_id not in completed_topics]

        # 4. Chunk Topics into Sessions
        max_chunk_minutes = constraints.max_session_minutes
        topic_chunks: Dict[str, List[int]] = {}
        for t_id in pending_topics:
            topic = topic_map[t_id]
            total_minutes = int(topic.estimated_hours * 60)
            chunks = []
            while total_minutes > 0:
                chunk = min(total_minutes, max_chunk_minutes)
                # Avoid tiny leftover chunks (e.g. < 20 mins) if possible
                if total_minutes - chunk > 0 and (total_minutes - chunk) < 20:
                    chunk = total_minutes // 2
                chunks.append(chunk)
                total_minutes -= chunk
            topic_chunks[t_id] = chunks

        # 5. Day-by-Day Constraint-Based Allocation
        current_date = today
        sessions: List[StudySession] = []
        simulated_completed: Set[str] = set(completed_topics)
        session_counter = 1

        # Track topic chunk progress: topic_id -> chunk_index
        topic_chunk_idx: Dict[str, int] = {t_id: 0 for t_id in pending_topics}

        # Available time slot start
        preferred_start = self.slot_times.get(constraints.preferred_time, "14:00")
        start_hour, start_min = map(int, preferred_start.split(":"))

        max_days = 180  # Safety horizon (6 months)
        day_offset = 0

        while any(topic_chunk_idx[t] < len(topic_chunks[t]) for t in pending_topics) and day_offset < max_days:
            # Check rest day (weekday(): 0=Mon, 6=Sun)
            if current_date.weekday() in constraints.rest_days:
                current_date += datetime.timedelta(days=1)
                day_offset += 1
                continue

            daily_capacity_minutes = int(constraints.available_daily_hours * 60)
            daily_used_minutes = 0
            current_time_minutes = start_hour * 60 + start_min

            # Update ready queue: topics whose prerequisites are all in simulated_completed
            available_topics = []
            for t_id in pending_topics:
                if topic_chunk_idx[t_id] < len(topic_chunks[t_id]):
                    prereqs = graph.reverse_adj.get(t_id, set())
                    if prereqs.issubset(simulated_completed):
                        available_topics.append(t_id)

            # Sort available topics by priority descending, tie-break by ID
            available_topics.sort(key=lambda t: (calculate_priority(t), -levels.get(t, 0), t), reverse=True)

            if not available_topics:
                # No topics currently ready; advance day
                current_date += datetime.timedelta(days=1)
                day_offset += 1
                continue

            scheduled_any_today = False
            for t_id in available_topics:
                if daily_used_minutes >= daily_capacity_minutes:
                    break

                remaining_chunks = topic_chunks[t_id][topic_chunk_idx[t_id] :]
                while remaining_chunks and (daily_used_minutes + remaining_chunks[0] <= daily_capacity_minutes):
                    chunk_dur = remaining_chunks.pop(0)
                    chunk_num = topic_chunk_idx[t_id] + 1
                    total_chunks = len(topic_chunks[t_id])

                    t_name = topic_map[t_id].name
                    display_name = f"{t_name} (Part {chunk_num}/{total_chunks})" if total_chunks > 1 else t_name

                    # Calculate session start and end times
                    s_hour = current_time_minutes // 60
                    s_min = current_time_minutes % 60
                    e_time_minutes = current_time_minutes + chunk_dur
                    e_hour = e_time_minutes // 60
                    e_min = e_time_minutes % 60

                    start_str = f"{s_hour:02d}:{s_min:02d}"
                    end_str = f"{e_hour:02d}:{e_min:02d}"

                    session = StudySession(
                        id=f"sess-{session_counter:03d}",
                        subject=subject_map[t_id],
                        topic_id=t_id,
                        topic_name=display_name,
                        date=current_date.isoformat(),
                        start_time=start_str,
                        end_time=end_str,
                        duration_minutes=chunk_dur,
                        difficulty=topic_map[t_id].difficulty,
                        status="upcoming",
                        session_type="study",
                    )
                    sessions.append(session)
                    session_counter += 1

                    daily_used_minutes += chunk_dur
                    current_time_minutes = e_time_minutes + 15  # 15 min break between sessions
                    topic_chunk_idx[t_id] += 1
                    scheduled_any_today = True

                    # If all chunks finished, topic is complete!
                    if topic_chunk_idx[t_id] == len(topic_chunks[t_id]):
                        simulated_completed.add(t_id)
                        break

            current_date += datetime.timedelta(days=1)
            day_offset += 1

        # 6. Check Feasibility against Exam Dates & Deadlines
        plan_end_date = sessions[-1].date if sessions else constraints.start_date
        total_planned_hours = sum(s.duration_minutes for s in sessions) / 60.0
        
        is_feasible = True
        feasibility_message = "Schedule generated successfully. All topics are on track."

        # Verify against each exam date
        for exam in syllabus.exam_dates:
            try:
                e_date = datetime.date.fromisoformat(exam.exam_date)
                # Find last session for this subject
                subj_sessions = [s for s in sessions if s.subject == exam.subject]
                if subj_sessions:
                    last_subj_date = datetime.date.fromisoformat(subj_sessions[-1].date)
                    if last_subj_date > e_date:
                        is_feasible = False
                        days_late = (last_subj_date - e_date).days
                        feasibility_message = (
                            f"Your available study time is insufficient to finish the syllabus before the deadline. "
                            f"{exam.subject} syllabus completes on {last_subj_date.isoformat()}, which is {days_late} day(s) "
                            f"after the exam on {exam.exam_date}. Consider increasing daily study hours or reducing rest days."
                        )
                        break
            except ValueError:
                pass

        if cycle_warnings and is_feasible:
            feasibility_message = f"Notice: Resolved {len(cycle_warnings)} circular prerequisite dependency. " + feasibility_message

        plan = StudyPlan(
            id=plan_id or f"plan-{uuid.uuid4().hex[:8]}",
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            start_date=constraints.start_date,
            end_date=plan_end_date,
            total_hours=round(total_planned_hours, 1),
            total_sessions=len(sessions),
            sessions=sessions,
            constraints=constraints,
            is_feasible=is_feasible,
            feasibility_message=feasibility_message,
        )
        return plan

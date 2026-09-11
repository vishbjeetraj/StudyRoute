import copy
import datetime
from typing import Dict, List, Optional, Set, Tuple
import uuid

try:
    from ..models.syllabus import Syllabus, Topic, ExamDate, CourseworkDeadline
    from ..models.schedule import StudyPlan, StudySession, ScheduleConstraints
    from ..models.disruption import DisruptionRequest, SessionDiff, RerouteExplanation, RerouteResponse
    from .scheduler import Scheduler
    from .graph import TopicGraph
except (ImportError, ValueError):
    from models.syllabus import Syllabus, Topic, ExamDate, CourseworkDeadline
    from models.schedule import StudyPlan, StudySession, ScheduleConstraints
    from models.disruption import DisruptionRequest, SessionDiff, RerouteExplanation, RerouteResponse
    from solver.scheduler import Scheduler
    from solver.graph import TopicGraph


class Rerouter:
    """
    Adaptive Rerouting Engine for StudyRoute.
    Recalculates study plans deterministically when student reality changes:
    1. Missed Session
    2. Topic Took Longer
    3. Changed Exam Date
    4. New Coursework Added
    """

    def __init__(self):
        self.scheduler = Scheduler()

    def generate_new_plan(self, request: DisruptionRequest) -> RerouteResponse:
        """
        Main entrypoint: analyzes disruption, computes new plan, and returns side-by-side diff.
        """
        disruption_type = request.disruption_type.lower()
        old_plan = request.current_plan
        syllabus = copy.deepcopy(request.syllabus)
        constraints = copy.deepcopy(old_plan.constraints)

        if disruption_type == "missed_session":
            return self._handle_missed_session(old_plan, syllabus, constraints, request.session_id)
        elif disruption_type == "topic_took_longer":
            return self._handle_topic_took_longer(
                old_plan, syllabus, constraints, request.topic_id, request.extra_minutes or 60
            )
        elif disruption_type == "changed_exam_date":
            return self._handle_changed_exam_date(
                old_plan, syllabus, constraints, request.subject, request.new_exam_date
            )
        elif disruption_type == "new_coursework":
            return self._handle_new_coursework(
                old_plan,
                syllabus,
                constraints,
                request.subject,
                request.new_topic_name,
                request.estimated_hours or 3.0,
                request.difficulty or "medium",
                request.deadline_date,
                request.prerequisites or [],
            )
        else:
            raise ValueError(f"Unsupported disruption type: {request.disruption_type}")

    def _handle_missed_session(
        self,
        old_plan: StudyPlan,
        syllabus: Syllabus,
        constraints: ScheduleConstraints,
        session_id: Optional[str],
    ) -> RerouteResponse:
        # Find missed session
        missed_sess = None
        for s in old_plan.sessions:
            if s.id == session_id:
                missed_sess = s
                break
        
        if not missed_sess and old_plan.sessions:
            # Default to first non-completed session if not specified
            for s in old_plan.sessions:
                if s.status in ("upcoming", "in_progress"):
                    missed_sess = s
                    break

        if not missed_sess:
            missed_sess = old_plan.sessions[0]

        # All completed sessions before or during are strictly preserved
        completed_sessions: List[StudySession] = [
            copy.deepcopy(s) for s in old_plan.sessions if s.status == "completed" and s.id != missed_sess.id
        ]
        
        # Identify topics that are fully completed
        # A topic is completed if all its sessions in old_plan are completed
        all_topic_sessions: Dict[str, List[StudySession]] = {}
        for s in old_plan.sessions:
            all_topic_sessions.setdefault(s.topic_id, []).append(s)

        completed_topic_ids: Set[str] = set()
        for t_id, t_sessions in all_topic_sessions.items():
            if all(s.status == "completed" and s.id != missed_sess.id for s in t_sessions):
                completed_topic_ids.add(t_id)

        # Mark missed session
        missed_sess_copy = copy.deepcopy(missed_sess)
        missed_sess_copy.status = "missed"
        missed_sess_copy.notes = "Marked as missed. Topic rescheduled in new route."

        # Reroute starting from the day after the missed session (or same day if preferred)
        missed_date = datetime.date.fromisoformat(missed_sess.date)
        reroute_start = (missed_date + datetime.timedelta(days=1)).isoformat()
        new_constraints = copy.deepcopy(constraints)
        new_constraints.start_date = reroute_start

        # Generate fresh schedule for remaining topics
        fresh_plan = self.scheduler.build_schedule(
            syllabus=syllabus,
            constraints=new_constraints,
            completed_topics=completed_topic_ids,
            plan_id=f"plan-reroute-{uuid.uuid4().hex[:6]}",
        )

        # Combine: Completed sessions + marked missed session + newly rescheduled sessions
        combined_sessions: List[StudySession] = []
        combined_sessions.extend(completed_sessions)
        combined_sessions.append(missed_sess_copy)
        
        # Re-number new sessions to avoid ID collisions
        sess_idx = len(combined_sessions) + 1
        for s in fresh_plan.sessions:
            s_copy = copy.deepcopy(s)
            s_copy.id = f"sess-{sess_idx:03d}"
            combined_sessions.append(s_copy)
            sess_idx += 1

        # Calculate new plan totals
        new_end_date = combined_sessions[-1].date if combined_sessions else old_plan.end_date
        total_hours = round(sum(s.duration_minutes for s in combined_sessions if s.status != "missed") / 60.0, 1)

        new_plan = StudyPlan(
            id=fresh_plan.id,
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            start_date=old_plan.start_date,
            end_date=new_end_date,
            total_hours=total_hours,
            total_sessions=len(combined_sessions),
            sessions=combined_sessions,
            constraints=constraints,
            is_feasible=fresh_plan.is_feasible,
            feasibility_message=fresh_plan.feasibility_message,
        )

        diffs, moved, changed, unchanged, new_cnt = self._compute_diffs(old_plan, new_plan, missed_sess.id)

        explanation = RerouteExplanation(
            what_changed=f"Rescheduled missed session '{missed_sess.topic_name}' starting from {reroute_start}. Downstream topics re-optimized to fill subsequent available days.",
            why="Maintained prerequisite dependencies while re-packing available study slots. Topics were not blindly delayed by a fixed offset.",
            what_stayed_the_same=f"Preserved {len(completed_sessions)} completed session(s). Retained all rest days and daily hour constraints.",
        )

        return RerouteResponse(
            old_plan=old_plan,
            new_plan=new_plan,
            diffs=diffs,
            explanation=explanation,
            moved_count=moved,
            changed_count=changed,
            unchanged_count=unchanged,
            new_count=new_cnt,
        )

    def _handle_topic_took_longer(
        self,
        old_plan: StudyPlan,
        syllabus: Syllabus,
        constraints: ScheduleConstraints,
        topic_id: Optional[str],
        extra_minutes: int,
    ) -> RerouteResponse:
        # Increase estimated hours for topic in syllabus
        target_topic = None
        for subject in syllabus.subjects:
            for topic in subject.topics:
                if topic.id == topic_id:
                    target_topic = topic
                    topic.estimated_hours += round(extra_minutes / 60.0, 2)
                    break
            if target_topic:
                break

        if not target_topic and syllabus.subjects and syllabus.subjects[0].topics:
            target_topic = syllabus.subjects[0].topics[0]
            target_topic.estimated_hours += round(extra_minutes / 60.0, 2)

        # Retain completed sessions
        completed_sessions = [copy.deepcopy(s) for s in old_plan.sessions if s.status == "completed"]
        completed_topic_ids = {s.topic_id for s in completed_sessions if s.topic_id != target_topic.id}

        # Start reroute from the date of the first upcoming session
        first_upcoming = next((s for s in old_plan.sessions if s.status == "upcoming"), old_plan.sessions[0])
        new_constraints = copy.deepcopy(constraints)
        new_constraints.start_date = first_upcoming.date

        fresh_plan = self.scheduler.build_schedule(
            syllabus=syllabus,
            constraints=new_constraints,
            completed_topics=completed_topic_ids,
            plan_id=f"plan-longer-{uuid.uuid4().hex[:6]}",
        )

        combined_sessions = list(completed_sessions)
        sess_idx = len(combined_sessions) + 1
        for s in fresh_plan.sessions:
            s_copy = copy.deepcopy(s)
            s_copy.id = f"sess-{sess_idx:03d}"
            combined_sessions.append(s_copy)
            sess_idx += 1

        new_end_date = combined_sessions[-1].date if combined_sessions else old_plan.end_date
        total_hours = round(sum(s.duration_minutes for s in combined_sessions) / 60.0, 1)

        new_plan = StudyPlan(
            id=fresh_plan.id,
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            start_date=old_plan.start_date,
            end_date=new_end_date,
            total_hours=total_hours,
            total_sessions=len(combined_sessions),
            sessions=combined_sessions,
            constraints=constraints,
            is_feasible=fresh_plan.is_feasible,
            feasibility_message=fresh_plan.feasibility_message,
        )

        diffs, moved, changed, unchanged, new_cnt = self._compute_diffs(old_plan, new_plan)

        explanation = RerouteExplanation(
            what_changed=f"Allocated {extra_minutes} additional minutes to '{target_topic.name}'. Subsequent study sessions were shifted to accommodate the deeper study time.",
            why=f"Concept depth required extra reinforcement. Dependent topics downstream were deferred until prerequisites are fully internalized.",
            what_stayed_the_same="All previously completed sessions and daily hour caps remain strictly honored.",
        )

        return RerouteResponse(
            old_plan=old_plan,
            new_plan=new_plan,
            diffs=diffs,
            explanation=explanation,
            moved_count=moved,
            changed_count=changed,
            unchanged_count=unchanged,
            new_count=new_cnt,
        )

    def _handle_changed_exam_date(
        self,
        old_plan: StudyPlan,
        syllabus: Syllabus,
        constraints: ScheduleConstraints,
        subject: Optional[str],
        new_exam_date: Optional[str],
    ) -> RerouteResponse:
        target_subject = subject or (syllabus.subjects[0].name if syllabus.subjects else "Core")
        new_date_str = new_exam_date or (datetime.date.today() + datetime.timedelta(days=20)).isoformat()

        # Update exam date in syllabus
        updated = False
        for ex in syllabus.exam_dates:
            if ex.subject.lower() == target_subject.lower():
                ex.exam_date = new_date_str
                updated = True
                break
        if not updated:
            syllabus.exam_dates.append(ExamDate(subject=target_subject, exam_date=new_date_str))

        # Completed sessions preserved
        completed_sessions = [copy.deepcopy(s) for s in old_plan.sessions if s.status == "completed"]
        completed_topic_ids = {s.topic_id for s in completed_sessions}

        first_upcoming = next((s for s in old_plan.sessions if s.status == "upcoming"), old_plan.sessions[0])
        new_constraints = copy.deepcopy(constraints)
        new_constraints.start_date = first_upcoming.date

        # Regenerate schedule with updated priority scoring
        fresh_plan = self.scheduler.build_schedule(
            syllabus=syllabus,
            constraints=new_constraints,
            completed_topics=completed_topic_ids,
            plan_id=f"plan-exam-{uuid.uuid4().hex[:6]}",
        )

        combined_sessions = list(completed_sessions)
        sess_idx = len(combined_sessions) + 1
        for s in fresh_plan.sessions:
            s_copy = copy.deepcopy(s)
            s_copy.id = f"sess-{sess_idx:03d}"
            combined_sessions.append(s_copy)
            sess_idx += 1

        new_end_date = combined_sessions[-1].date if combined_sessions else old_plan.end_date
        total_hours = round(sum(s.duration_minutes for s in combined_sessions) / 60.0, 1)

        new_plan = StudyPlan(
            id=fresh_plan.id,
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            start_date=old_plan.start_date,
            end_date=new_end_date,
            total_hours=total_hours,
            total_sessions=len(combined_sessions),
            sessions=combined_sessions,
            constraints=constraints,
            is_feasible=fresh_plan.is_feasible,
            feasibility_message=fresh_plan.feasibility_message,
        )

        diffs, moved, changed, unchanged, new_cnt = self._compute_diffs(old_plan, new_plan)

        explanation = RerouteExplanation(
            what_changed=f"Recalculated priorities with '{target_subject}' exam moved to {new_date_str}. Sessions for this subject were boosted forward to ensure thorough review before the new date.",
            why="Urgency weights dynamically escalated for the revised exam deadline, interleaving high-priority topics earlier in the study calendar.",
            what_stayed_the_same="Topics in other unaffected subjects and completed sessions were preserved.",
        )

        return RerouteResponse(
            old_plan=old_plan,
            new_plan=new_plan,
            diffs=diffs,
            explanation=explanation,
            moved_count=moved,
            changed_count=changed,
            unchanged_count=unchanged,
            new_count=new_cnt,
        )

    def _handle_new_coursework(
        self,
        old_plan: StudyPlan,
        syllabus: Syllabus,
        constraints: ScheduleConstraints,
        subject_name: Optional[str],
        topic_name: Optional[str],
        hours: float,
        difficulty: str,
        deadline_date: Optional[str],
        prerequisites: List[str],
    ) -> RerouteResponse:
        subj_name = subject_name or (syllabus.subjects[0].name if syllabus.subjects else "General")
        t_name = topic_name or "New Coursework Assignment"
        slug_id = "cw-" + t_name.lower().replace(" ", "-")[:20] + f"-{uuid.uuid4().hex[:4]}"

        new_topic = Topic(
            id=slug_id,
            name=t_name,
            difficulty=difficulty,
            estimated_hours=hours,
            prerequisites=prerequisites,
            unit="Coursework & Projects",
            completed=False,
        )

        # Add topic to subject
        subject_found = False
        for s in syllabus.subjects:
            if s.name.lower() == subj_name.lower():
                s.topics.append(new_topic)
                subject_found = True
                break
        if not subject_found:
            syllabus.subjects.append(Subject(name=subj_name, topics=[new_topic]))

        if deadline_date:
            syllabus.coursework_deadlines.append(
                CourseworkDeadline(
                    title=t_name,
                    subject=subj_name,
                    deadline_date=deadline_date,
                    estimated_hours=hours,
                )
            )

        completed_sessions = [copy.deepcopy(s) for s in old_plan.sessions if s.status == "completed"]
        completed_topic_ids = {s.topic_id for s in completed_sessions}

        first_upcoming = next((s for s in old_plan.sessions if s.status == "upcoming"), old_plan.sessions[0])
        new_constraints = copy.deepcopy(constraints)
        new_constraints.start_date = first_upcoming.date

        fresh_plan = self.scheduler.build_schedule(
            syllabus=syllabus,
            constraints=new_constraints,
            completed_topics=completed_topic_ids,
            plan_id=f"plan-cw-{uuid.uuid4().hex[:6]}",
        )

        combined_sessions = list(completed_sessions)
        sess_idx = len(combined_sessions) + 1
        for s in fresh_plan.sessions:
            s_copy = copy.deepcopy(s)
            s_copy.id = f"sess-{sess_idx:03d}"
            combined_sessions.append(s_copy)
            sess_idx += 1

        new_end_date = combined_sessions[-1].date if combined_sessions else old_plan.end_date
        total_hours = round(sum(s.duration_minutes for s in combined_sessions) / 60.0, 1)

        new_plan = StudyPlan(
            id=fresh_plan.id,
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
            start_date=old_plan.start_date,
            end_date=new_end_date,
            total_hours=total_hours,
            total_sessions=len(combined_sessions),
            sessions=combined_sessions,
            constraints=constraints,
            is_feasible=fresh_plan.is_feasible,
            feasibility_message=fresh_plan.feasibility_message,
        )

        diffs, moved, changed, unchanged, new_cnt = self._compute_diffs(old_plan, new_plan, new_topic_id=slug_id)

        explanation = RerouteExplanation(
            what_changed=f"Injected new coursework '{t_name}' ({hours} hrs) into '{subj_name}'. Integrated sessions into the timeline respecting its prerequisites.",
            why="Added topic dynamically to dependency graph and topologically slotted before its deadline without breaking existing study flows.",
            what_stayed_the_same="Existing completed work and unimpacted prerequisites remain untouched.",
        )

        return RerouteResponse(
            old_plan=old_plan,
            new_plan=new_plan,
            diffs=diffs,
            explanation=explanation,
            moved_count=moved,
            changed_count=changed,
            unchanged_count=unchanged,
            new_count=new_cnt,
        )

    def _compute_diffs(
        self,
        old_plan: StudyPlan,
        new_plan: StudyPlan,
        missed_session_id: Optional[str] = None,
        new_topic_id: Optional[str] = None,
    ) -> Tuple[List[SessionDiff], int, int, int, int]:
        """
        Compare old plan and new plan sessions to produce detailed visual diffs.
        """
        old_map: Dict[str, StudySession] = {s.id: s for s in old_plan.sessions}
        new_map: Dict[str, StudySession] = {s.id: s for s in new_plan.sessions}

        diffs: List[SessionDiff] = []
        moved_count = 0
        changed_count = 0
        unchanged_count = 0
        new_count = 0

        # Match by topic_id + part or position
        # For intuitive diffs, compare by topic name and date
        old_by_topic: Dict[str, List[StudySession]] = {}
        for s in old_plan.sessions:
            old_by_topic.setdefault(s.topic_id, []).append(s)

        new_by_topic: Dict[str, List[StudySession]] = {}
        for s in new_plan.sessions:
            new_by_topic.setdefault(s.topic_id, []).append(s)

        for s in new_plan.sessions:
            # Check if this is a newly introduced topic session
            if new_topic_id and s.topic_id == new_topic_id:
                diffs.append(
                    SessionDiff(
                        session_id=s.id,
                        topic_name=s.topic_name,
                        subject=s.subject,
                        diff_type="new",
                        new_date=s.date,
                        new_duration=s.duration_minutes,
                        change_reason="Newly added coursework session",
                    )
                )
                new_count += 1
                continue

            # Check if matching old session exists
            matching_old = None
            if s.id in old_map:
                matching_old = old_map[s.id]
            elif s.topic_id in old_by_topic and old_by_topic[s.topic_id]:
                matching_old = old_by_topic[s.topic_id][0]

            if matching_old:
                if s.status == "missed" or s.id == missed_session_id:
                    diffs.append(
                        SessionDiff(
                            session_id=s.id,
                            topic_name=s.topic_name,
                            subject=s.subject,
                            diff_type="changed",
                            old_date=matching_old.date,
                            new_date=s.date,
                            old_duration=matching_old.duration_minutes,
                            new_duration=s.duration_minutes,
                            change_reason="Session was missed and rescheduled",
                        )
                    )
                    changed_count += 1
                elif s.date != matching_old.date:
                    diffs.append(
                        SessionDiff(
                            session_id=s.id,
                            topic_name=s.topic_name,
                            subject=s.subject,
                            diff_type="moved",
                            old_date=matching_old.date,
                            new_date=s.date,
                            old_duration=matching_old.duration_minutes,
                            new_duration=s.duration_minutes,
                            change_reason=f"Date shifted from {matching_old.date} to {s.date}",
                        )
                    )
                    moved_count += 1
                elif s.duration_minutes != matching_old.duration_minutes:
                    diffs.append(
                        SessionDiff(
                            session_id=s.id,
                            topic_name=s.topic_name,
                            subject=s.subject,
                            diff_type="changed",
                            old_date=matching_old.date,
                            new_date=s.date,
                            old_duration=matching_old.duration_minutes,
                            new_duration=s.duration_minutes,
                            change_reason=f"Duration adjusted ({matching_old.duration_minutes}m -> {s.duration_minutes}m)",
                        )
                    )
                    changed_count += 1
                else:
                    diffs.append(
                        SessionDiff(
                            session_id=s.id,
                            topic_name=s.topic_name,
                            subject=s.subject,
                            diff_type="unchanged",
                            old_date=matching_old.date,
                            new_date=s.date,
                            old_duration=matching_old.duration_minutes,
                            new_duration=s.duration_minutes,
                            change_reason="Preserved without modification",
                        )
                    )
                    unchanged_count += 1
            else:
                diffs.append(
                    SessionDiff(
                        session_id=s.id,
                        topic_name=s.topic_name,
                        subject=s.subject,
                        diff_type="new",
                        new_date=s.date,
                        new_duration=s.duration_minutes,
                        change_reason="Added in rescheduled plan",
                    )
                )
                new_count += 1

        return diffs, moved_count, changed_count, unchanged_count, new_count

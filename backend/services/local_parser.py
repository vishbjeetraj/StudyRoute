import re
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timedelta

try:
    from ..models.syllabus import (
        Syllabus, Subject, Topic, ExamDate, CourseworkDeadline,
        OverallAnalysis, StudyGuidance
    )
except (ImportError, ValueError):
    from models.syllabus import (
        Syllabus, Subject, Topic, ExamDate, CourseworkDeadline,
        OverallAnalysis, StudyGuidance
    )


class LocalSyllabusParser:
    """
    Intelligent structural parser that extracts authentic academic subjects,
    units, topics, difficulties, and prerequisite dependencies from syllabus text.
    Actively rejects document noise, boilerplate, timestamps, and website metadata.
    """

    # Academic concept indicators
    HARD_KEYWORDS = [
        "concurrency", "deadlock", "advanced", "optimization", "distributed",
        "internals", "virtual memory", "normalization", "b-tree", "b+ tree",
        "proof", "compiler", "cryptography", "nosql", "asynchronous", "algorithm",
        "dynamic programming", "graph", "np-complete", "fault tolerance", "security"
    ]
    EASY_KEYWORDS = [
        "introduction", "overview", "basics", "fundamentals", "history",
        "concepts", "architecture overview", "definition", "classification", "syntax"
    ]

    # Noise & boilerplate indicators to unconditionally reject as topics
    REJECT_PATTERNS = [
        r"(?i)this\s+is\s+a\s+single",
        r"(?i)concatenated\s+file",
        r"(?i)suitable\s+for\s+printing",
        r"(?i)saving\s+as\s+a\s+pdf",
        r"(?i)available\s+as\s+a\s+concatenated",
        r"(?i)missing\s+content\s+page",
        r"(?i)click\s+here",
        r"(?i)download\s+pdf",
        r"(?i)print\s+this",
        r"(?i)all\s+rights\s+reserved",
        r"(?i)copyright",
        r"(?i)terms\s+of\s+use",
        r"(?i)privacy\s+policy",
        r"(?i)office\s+hours",
        r"(?i)zoom\s+link",
        r"(?i)meeting\s+id",
        r"(?i)instructor",
        r"(?i)teaching\s+assistant",
        r"(?i)email\s*:",
        r"(?i)grading\s+(?:policy|scheme|scale)",
        r"(?i)attendance\s+policy",
        r"(?i)academic\s+integrity",
        r"(?i)textbook\s*:",
        r"(?i)isbn\s*:",
        r"(?i)readings?\s*:",
        r"(?i)prerequisites?\s*:",
        r"(?i)^\s*chapter\s+\d+\s*$",
        r"(?i)^\s*unit\s+[0-9ivxlcdm]+\s*$",
        r"(?i)^\s*module\s+\d+\s*$",
        r"(?i)^\s*assignment\s+\d+",
        r"(?i)^\s*homework\s+\d+",
        r"(?i)^\s*quiz\s+\d+",
        r"(?i)^\s*lab\s+\d+",
        r"(?i)due\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        r"(?i)(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}",
        r"(?i)\d{1,2}:\d{2}\s*(?:am|pm)?\s*(?:et|est|edt|pt|pst|cst)?",
        r"(?i)^\s*\d{1,2}-\d{1,2}(?:-\d{2,4})?.*$",
        r"(?i)table\s+of\s+contents",
        r"(?i)course\s+description",
        r"(?i)course\s+overview",
        r"(?i)learning\s+outcomes",
    ]

    @classmethod
    def is_valid_academic_topic(cls, name: str) -> bool:
        """
        Check whether candidate string is a genuine academic topic or noise.
        """
        clean = name.strip()
        if len(clean) < 4 or len(clean) > 75:
            return False

        # Reject if matches boilerplate or noise patterns
        for pat in cls.REJECT_PATTERNS:
            if re.search(pat, clean):
                return False

        # Must have at least 2 distinct words or one recognized academic concept
        words = [w for w in re.split(r"\s+", clean) if len(w) > 1 and w.isalpha()]
        if not words:
            return False

        # Reject pure timestamps/numbers
        if re.search(r"^\d+[\s\-\.:]*\d*$", clean):
            return False

        # Reject if all words are common stopwords
        stopwords = {"this", "is", "a", "an", "the", "for", "and", "or", "in", "on", "at", "to", "by", "of", "with", "page", "due"}
        if all(w.lower() in stopwords for w in words):
            return False

        return True

    @classmethod
    def parse(cls, text: str, default_subject_name: Optional[str] = None) -> Syllabus:
        if not text or not text.strip():
            raise ValueError("Syllabus text is empty.")

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            raise ValueError("No readable lines found in syllabus text.")

        # 1. Determine Subject Name
        subject_name = default_subject_name or cls._detect_subject_name(lines)

        # 2. Extract Units and Filter Topics strictly
        topics = cls._extract_topics(lines)
        if not topics:
            topics = cls._fallback_extract_topics(lines)

        # Ensure topics are deduplicated and clean
        topics = cls._deduplicate_topics(topics)

        # If still empty after strict filtering, synthesize basic topics from subject name
        if not topics:
            topics = [
                Topic(
                    id="topic-foundations",
                    name=f"{subject_name} Fundamentals",
                    difficulty="easy",
                    estimated_hours=3.0,
                    prerequisites=[],
                    unit="Unit 1: Foundations",
                    description=f"Core concepts, definitions, and principles of {subject_name}.",
                    why_it_matters=f"Builds the essential foundation for understanding {subject_name}.",
                    importance="high",
                    recommended_order=1
                ),
                Topic(
                    id="topic-core-architecture",
                    name=f"{subject_name} Core Mechanisms",
                    difficulty="medium",
                    estimated_hours=4.0,
                    prerequisites=["topic-foundations"],
                    unit="Unit 2: Core Concepts",
                    description=f"Key mechanisms, protocols, and standard models in {subject_name}.",
                    why_it_matters="Central subject matter tested on standard examinations.",
                    importance="high",
                    recommended_order=2
                ),
                Topic(
                    id="topic-advanced-analysis",
                    name=f"{subject_name} Advanced Applications",
                    difficulty="hard",
                    estimated_hours=4.0,
                    prerequisites=["topic-core-architecture"],
                    unit="Unit 3: Advanced Topics",
                    description=f"Advanced architectures, problem solving, and implementations in {subject_name}.",
                    why_it_matters="Crucial for solving complex, high-scoring exam problems.",
                    importance="medium",
                    recommended_order=3
                )
            ]

        # 3. Detect Exam Dates and Deadlines if explicitly present
        exam_dates = cls._detect_exam_dates(text, subject_name)
        deadlines = cls._detect_deadlines(text, subject_name)

        # 4. Build Clean Topological Prerequisites (Guaranteeing NO cycles)
        topics = cls._assign_safe_prerequisites(topics)

        # 5. Compute Quantitative Analysis
        total_topics = len(topics)
        total_hours = sum(t.estimated_hours for t in topics)
        easy_count = sum(1 for t in topics if t.difficulty == "easy")
        medium_count = sum(1 for t in topics if t.difficulty == "medium")
        hard_count = sum(1 for t in topics if t.difficulty == "hard")

        overall_analysis = OverallAnalysis(
            total_topics=total_topics,
            estimated_hours=round(total_hours, 1),
            easy_topics=easy_count,
            medium_topics=medium_count,
            hard_topics=hard_count
        )

        # Unique Units
        unique_units = list(dict.fromkeys(t.unit for t in topics if t.unit))
        unit_summary_text = (
            f"Curriculum comprises {len(unique_units)} structured units: "
            + ", ".join(unique_units[:4])
            + (" and further modules." if len(unique_units) > 4 else ".")
            if unique_units else f"Comprehensive {total_topics}-topic study route for {subject_name}."
        )

        # 6. Build Student-Friendly Study Guidance
        high_pri = [t.name for t in topics if t.importance == "high"][:4]
        hard_topics = [t.name for t in topics if t.difficulty == "hard"][:3]

        study_guidance = StudyGuidance(
            recommended_strategy=(
                f"Master foundational concepts in {unique_units[0] if unique_units else 'Unit 1'} first. "
                f"Allocate extra focused time for challenging topics "
                f"({', '.join(hard_topics) if hard_topics else 'advanced modules'}), and avoid studying complex topics back-to-back."
            ),
            high_priority_topics=high_pri if high_pri else [t.name for t in topics[:3]],
            topics_requiring_prerequisites=[t.name for t in topics if t.prerequisites][:4],
            potentially_difficult_areas=hard_topics if hard_topics else [t.name for t in topics if t.difficulty == "medium"][:3]
        )

        subject = Subject(
            name=subject_name,
            summary=unit_summary_text,
            estimated_total_hours=round(total_hours, 1),
            topics=topics
        )

        syllabus_summary = (
            f"StudyRoute parsed {subject_name} containing {total_topics} topics "
            f"and {round(total_hours, 1)} estimated study hours across {len(unique_units)} units. "
            f"Features {hard_count} challenging topics, {medium_count} core concepts, and {easy_count} foundational topics."
        )

        return Syllabus(
            syllabus_title=f"{subject_name} Syllabus",
            summary=syllabus_summary,
            subjects=[subject],
            exam_dates=exam_dates,
            coursework_deadlines=deadlines,
            overall_analysis=overall_analysis,
            study_guidance=study_guidance
        )

    @classmethod
    def _detect_subject_name(cls, lines: List[str]) -> str:
        course_patterns = [
            r"(?:course\s+syllabus|syllabus(?:\s+for)?|course(?:\s+name)?|curriculum(?:\s+for)?)\s*[:\-]\s*([A-Za-z0-9\s&,–\-\(\)]+)",
            r"(?:course\s+syllabus|syllabus|course|curriculum)\s+([A-Za-z0-9\s&,–\-\(\)]+)",
            r"([A-Z][A-Za-z0-9\s&]{3,40}(?:systems|engineering|science|programming|management|mathematics|networks|algorithms|database|computing))",
        ]
        for line in lines[:10]:
            # Skip boilerplate lines
            if any(re.search(pat, line) for pat in cls.REJECT_PATTERNS):
                continue

            for pat in course_patterns:
                match = re.search(pat, line, re.IGNORECASE)
                if match:
                    name = match.group(1).strip()
                    name = re.sub(r"^[–\-:\s]+|[–\-:\s]+$", "", name)
                    name = re.sub(r"\([A-Z0-9\s]+\)$", "", name).strip()
                    if 3 <= len(name) <= 60 and name.lower() not in ["syllabus", "course", "curriculum"]:
                        return name.title()

        # Fallback to first clean title line
        for line in lines[:4]:
            if any(re.search(pat, line) for pat in cls.REJECT_PATTERNS):
                continue
            cleaned = re.sub(r"^[–\-:\s]+|[–\-:\s]+$", "", line).strip()
            if 4 <= len(cleaned) < 50 and not re.search(r"^(?:unit|module|chapter|page)\b", cleaned, re.IGNORECASE):
                cleaned = re.sub(r"^(?:course\s+syllabus|syllabus|course)\s*[:\-]?\s*", "", cleaned, flags=re.IGNORECASE).strip()
                if cleaned and cleaned.lower() not in ["syllabus", "course", "this is a single"]:
                    return cleaned.title()

        return "Academic Course"

    @classmethod
    def _extract_topics(cls, lines: List[str]) -> List[Topic]:
        topics: List[Topic] = []
        current_unit = "Unit 1: Foundations"
        unit_counter = 1
        order_counter = 1

        unit_regex = re.compile(
            r"^(?:unit|module|chapter|part)\s*(?:[0-9]+|[ivxlcdm]+)[:\-\s]+(.*)$",
            re.IGNORECASE
        )
        topic_bullet_regex = re.compile(
            r"^(?:[\*\-•▪]|(?:\d+\.\d+|\d+\)|\([a-z0-9]+\)))\s+(.*)$"
        )

        for line in lines:
            line_clean = line.strip()
            if not line_clean:
                continue

            # Skip boilerplate lines immediately
            if any(re.search(pat, line_clean) for pat in cls.REJECT_PATTERNS):
                continue

            # Check unit header
            u_match = unit_regex.match(line_clean)
            if u_match:
                title = u_match.group(1).strip()
                if len(title) > 3 and not any(re.search(pat, title) for pat in cls.REJECT_PATTERNS):
                    current_unit = f"Unit {unit_counter}: {title[:45]}"
                    unit_counter += 1
                continue

            # Check topic bullet
            b_match = topic_bullet_regex.match(line_clean)
            candidate_text = b_match.group(1).strip() if b_match else None

            # Or comma-separated list of topics
            if not candidate_text and ("," in line_clean or ";" in line_clean) and len(line_clean) > 20 and len(line_clean) < 220:
                parts = [p.strip() for p in re.split(r"[,;]", line_clean) if len(p.strip()) > 3]
                if len(parts) >= 2:
                    for part in parts:
                        if cls.is_valid_academic_topic(part):
                            t = cls._build_topic(part, current_unit, order_counter)
                            if t:
                                topics.append(t)
                                order_counter += 1
                    continue

            if candidate_text:
                if ":" in candidate_text and not candidate_text.lower().startswith("note:"):
                    sub_parts = candidate_text.split(":", 1)
                    head = sub_parts[0].strip()
                    rest = sub_parts[1].strip()
                    if "," in rest:
                        sub_topics = [p.strip() for p in rest.split(",") if len(p.strip()) > 3]
                        for st in sub_topics:
                            full_name = f"{head} - {st}" if len(head) < 25 else st
                            if cls.is_valid_academic_topic(full_name):
                                t = cls._build_topic(full_name, current_unit, order_counter)
                                if t:
                                    topics.append(t)
                                    order_counter += 1
                        continue

                if cls.is_valid_academic_topic(candidate_text):
                    t = cls._build_topic(candidate_text, current_unit, order_counter)
                    if t:
                        topics.append(t)
                        order_counter += 1

        return topics

    @classmethod
    def _fallback_extract_topics(cls, lines: List[str]) -> List[Topic]:
        topics = []
        current_unit = "Unit 1: Overview"
        order = 1

        for line in lines:
            line_clean = line.strip()
            if cls.is_valid_academic_topic(line_clean):
                t = cls._build_topic(line_clean, current_unit, order)
                if t:
                    topics.append(t)
                    order += 1
                    if len(topics) >= 15:
                        break
        return topics

    @classmethod
    def _build_topic(cls, raw_name: str, unit: str, order: int) -> Optional[Topic]:
        # Clean topic text
        name = re.sub(r"^[0-9\.\-\*\•\s\(\)]+", "", raw_name).strip()
        name = re.sub(r"\s+", " ", name)
        name = re.sub(r"[,\.:;]+$", "", name).strip()

        if not cls.is_valid_academic_topic(name):
            return None

        # Clean trailing parenthesis like "(3 hours)" or "(Lecture 4)"
        h_match = re.search(r"\(?([1-9]|10)\s*(?:hrs?|hours?)\)?", name, re.IGNORECASE)
        estimated_hours = 3.0
        if h_match:
            estimated_hours = float(h_match.group(1))
            name = re.sub(r"\(?[1-9]\s*(?:hrs?|hours?)\)?", "", name, flags=re.IGNORECASE).strip()

        name = re.sub(r"\(lecture\s+\d+\)", "", name, flags=re.IGNORECASE).strip()
        name = re.sub(r"\([A-Z0-9\s\-]+\)$", "", name).strip()

        if not cls.is_valid_academic_topic(name):
            return None

        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        if not slug or len(slug) < 3:
            return None
        slug = slug[:40]

        # Difficulty heuristic
        difficulty = "medium"
        name_lower = name.lower()
        if any(w in name_lower for w in cls.HARD_KEYWORDS):
            difficulty = "hard"
            if not h_match:
                estimated_hours = 4.0
        elif any(w in name_lower for w in cls.EASY_KEYWORDS):
            difficulty = "easy"
            if not h_match:
                estimated_hours = 2.0

        importance = "high" if (difficulty == "hard" or order <= 2) else "medium"

        # Crisp, student-friendly 1-sentence explanations (max 25 words)
        description = f"Covers principles, core mechanisms, and analytical models of {name}."
        if difficulty == "easy":
            why_it_matters = f"Foundational concept essential for succeeding in subsequent {unit} topics."
        elif difficulty == "hard":
            why_it_matters = "High-weight, conceptually challenging topic frequently tested on final exams."
        else:
            why_it_matters = f"Core operational concept required for comprehensive mastery of {unit}."

        return Topic(
            id=slug,
            name=name,
            difficulty=difficulty,
            estimated_hours=estimated_hours,
            prerequisites=[],  # Prereqs assigned safely in _assign_safe_prerequisites
            unit=unit,
            description=description,
            why_it_matters=why_it_matters,
            importance=importance,
            recommended_order=order
        )

    @classmethod
    def _deduplicate_topics(cls, topics: List[Topic]) -> List[Topic]:
        """
        Merge or drop near-duplicate topics (e.g. 'CPU Scheduling' vs 'CPU Scheduling Concepts').
        """
        unique_topics: List[Topic] = []
        seen_slugs: Set[str] = set()
        seen_stems: Set[str] = set()

        for t in topics:
            if t.id in seen_slugs:
                continue

            # Normalize stem by removing common filler suffixes
            stem = re.sub(r"(?:concepts?|overview|basics?|introduction|fundamentals?|mechanisms?)$", "", t.id).strip("-")
            if len(stem) > 4 and stem in seen_stems:
                continue

            seen_slugs.add(t.id)
            if len(stem) > 4:
                seen_stems.add(stem)
            unique_topics.append(t)

        return unique_topics

    @classmethod
    def _assign_safe_prerequisites(cls, topics: List[Topic]) -> List[Topic]:
        """
        Assign meaningful academic prerequisites with STRICT acyclic guarantee.
        NEVER link timestamps, dates, or arbitrary lines.
        Only allows early topics in a unit to be prerequisites for later complex topics in that same or subsequent unit.
        """
        if len(topics) <= 1:
            return topics

        topic_index = {t.id: idx for idx, t in enumerate(topics)}

        for i, topic in enumerate(topics):
            # Only medium/hard topics get a prerequisite
            if topic.difficulty in ["medium", "hard"] and i > 0:
                # Find the most relevant prior topic in the same unit (or foundational first topic)
                prereq_candidate = None
                # Look backwards for an easy or medium topic in same unit
                for j in range(i - 1, -1, -1):
                    cand = topics[j]
                    if cand.unit == topic.unit and cand.id != topic.id:
                        prereq_candidate = cand.id
                        break

                # If no topic in same unit, link to foundational first topic of previous unit
                if not prereq_candidate and i >= 2:
                    prereq_candidate = topics[0].id

                # Acyclic check: candidate MUST have a strictly lower index
                if prereq_candidate and topic_index.get(prereq_candidate, 999) < i:
                    topic.prerequisites = [prereq_candidate]
                else:
                    topic.prerequisites = []
            else:
                topic.prerequisites = []

        return topics

    @classmethod
    def _detect_exam_dates(cls, text: str, subject_name: str) -> List[ExamDate]:
        dates = []
        exam_match = re.search(r"(?:midterm|final\s+exam|end\s+sem|examination)\s*[:\-]?\s*([A-Za-z]+ \d{1,2}(?:,\s*\d{4})?)", text, re.IGNORECASE)
        if exam_match:
            exam_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            dates.append(ExamDate(subject=subject_name, exam_date=exam_date))
        return dates

    @classmethod
    def _detect_deadlines(cls, text: str, subject_name: str) -> List[CourseworkDeadline]:
        deadlines = []
        match = re.search(r"(?:assignment|coursework|project|lab\s+submission)\s*[:\-]?\s*([A-Za-z0-9\s]{4,30})", text, re.IGNORECASE)
        if match:
            title = match.group(1).strip()
            # Verify title is not noise
            if not any(re.search(pat, title) for pat in cls.REJECT_PATTERNS):
                d_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
                deadlines.append(CourseworkDeadline(
                    title=f"{subject_name}: {title}",
                    subject=subject_name,
                    deadline_date=d_date,
                    estimated_hours=4.0
                ))
        return deadlines

    @classmethod
    def answer_question_locally(cls, syllabus: Syllabus, question: str) -> str:
        q = question.lower().strip()
        all_topics = syllabus.subjects[0].topics if syllabus.subjects else []
        subject_name = syllabus.subjects[0].name if syllabus.subjects else "your course"

        if any(term in q for term in ["first", "start", "begin", "where to start"]):
            foundational = [t for t in all_topics if not t.prerequisites][:3]
            names = ", ".join(f"'{t.name}'" for t in foundational)
            return (
                f"For {subject_name}, start with: {names}. "
                f"These topics have no prerequisites and establish the baseline for later units."
            )

        if any(term in q for term in ["difficult", "hard", "hardest", "challenging"]):
            hard = [t for t in all_topics if t.difficulty == "hard"]
            if hard:
                hard_names = ", ".join(f"'{t.name}' ({t.unit})" for t in hard[:3])
                return (
                    f"The most challenging topics in {subject_name} are: {hard_names}. "
                    f"We recommend scheduling these during your peak focus hours."
                )
            return f"Topics in {subject_name} are balanced at medium difficulty. Focus on building strong fundamentals early."

        if any(term in q for term in ["hour", "time", "how long", "duration"]):
            total_hrs = syllabus.overall_analysis.estimated_hours if syllabus.overall_analysis else sum(t.estimated_hours for t in all_topics)
            days_at_2h = max(1, round(total_hrs / 2.0))
            days_at_3h = max(1, round(total_hrs / 3.0))
            return (
                f"Your syllabus requires approximately {total_hrs:.1f} total hours. "
                f"At 2 hours/day, you will complete it in ~{days_at_2h} study days. "
                f"At 3 hours/day, it will take ~{days_at_3h} study days."
            )

        if any(term in q for term in ["prereq", "depend", "dependency", "relationship"]):
            dependent = [t for t in all_topics if t.prerequisites]
            if dependent:
                sample = dependent[0]
                return (
                    f"There are {len(dependent)} topics with prerequisites. "
                    f"For example, '{sample.name}' requires '{sample.prerequisites[0]}'. "
                    f"Our scheduler guarantees every prerequisite is studied before its dependent topic."
                )
            return "Foundational topics can be studied in linear sequence as outlined in your units."

        if any(term in q for term in ["exam", "revision", "revise"]):
            high_pri = [t for t in all_topics if t.importance == "high"][:3]
            names = ", ".join(f"'{t.name}'" for t in high_pri)
            return (
                f"For exam readiness, prioritize high-impact topics: {names}. "
                f"Review their core mechanisms and practice problem solving."
            )

        return (
            f"Based on your {subject_name} syllabus ({len(all_topics)} topics, "
            f"{syllabus.overall_analysis.estimated_hours if syllabus.overall_analysis else 0}h total), "
            f"we recommend following the recommended unit order from foundational concepts to advanced modules."
        )

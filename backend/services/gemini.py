import json
import os
import re
from typing import Dict, Any, Optional

try:
    from ..models.syllabus import (
        Syllabus, Subject, Topic, OverallAnalysis, StudyGuidance
    )
    from .local_parser import LocalSyllabusParser
except (ImportError, ValueError):
    from models.syllabus import (
        Syllabus, Subject, Topic, OverallAnalysis, StudyGuidance
    )
    from services.local_parser import LocalSyllabusParser

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


SYLLABUS_EXTRACTION_PROMPT = """
You are an expert academic curriculum analyst for StudyRoute.
Analyze the provided syllabus text and convert it into an insightful, structured JSON object according to the exact schema below.

CRITICAL RULES AGAINST NOISE & BOILERPLATE:
1. Return ONLY pure valid JSON. No conversational text, no markdown backticks, no preamble.
2. ABSOLUTELY DO NOT convert document boilerplate, navigation text, page numbers, timestamps, download instructions, or website metadata into topics.
   - REJECT phrases like: "This is a single", "concatenated file", "suitable for printing or saving as a PDF", "This module is also available as a concatenated page", "missing content pages", "00-8-30-pm-et", "Click here", "Download PDF", "Copyright", "Page 12".
3. Every single topic MUST be a legitimate academic concept, subject, chapter, or learning objective that a student studies (e.g., "CPU Scheduling", "Virtual Memory", "Deadlocks", "Normalization", "Relational Algebra").
4. Deduplicate near-identical topics (e.g. "CPU Scheduling" and "CPU Scheduling Concepts" must be merged into one clean topic).
5. For each topic provide:
   - "id": unique lowercase slug (e.g. "cpu-scheduling", "deadlocks")
   - "name": clean human-readable academic title
   - "difficulty": "easy" (foundational), "medium" (core concept), or "hard" (advanced/complex)
   - "estimated_hours": realistic study hours (between 1.0 and 6.0)
   - "prerequisites": list of prerequisite topic IDs from earlier topics in the syllabus. MUST FORM A DIRECTED ACYCLIC GRAPH. If uncertain, leave as []. NEVER invent circular dependencies.
   - "unit": unit or module title (e.g. "Unit 1: Process Management")
   - "description": exactly 1 short student-friendly sentence explaining what this concept is (20-30 words max).
   - "why_it_matters": exactly 1 short sentence explaining why it is important for exams (15-25 words max). No generic enterprise/industrial filler.
   - "importance": "high" (exam-heavy / key prerequisite), "medium", or "low"
   - "recommended_order": suggested sequence number (1, 2, 3...)
6. Include "overall_analysis" with total topic counts, total hours, and easy/medium/hard breakdown.
7. Include "study_guidance" with concise recommended strategy, high priority topics, and potentially difficult areas.
8. Only extract genuine exam dates or assignment deadlines if explicitly stated in the document.

JSON Schema format:
{
  "syllabus_title": "Course Title Syllabus",
  "summary": "High-level summary of the curriculum and main units.",
  "subjects": [
    {
      "id": "subject-slug",
      "name": "Subject Name",
      "summary": "Summary of subject units.",
      "estimated_total_hours": 30.0,
      "topics": [
        {
          "id": "topic-slug",
          "name": "Topic Name",
          "difficulty": "easy" | "medium" | "hard",
          "estimated_hours": 3.0,
          "prerequisites": [],
          "unit": "Unit 1: Title",
          "description": "One concise student-friendly sentence explaining this topic.",
          "why_it_matters": "One concise sentence explaining why this topic matters for exams.",
          "importance": "high" | "medium" | "low",
          "recommended_order": 1
        }
      ]
    }
  ],
  "exam_dates": [],
  "coursework_deadlines": [],
  "overall_analysis": {
    "total_topics": 15,
    "estimated_hours": 36.0,
    "easy_topics": 4,
    "medium_topics": 8,
    "hard_topics": 3
  },
  "study_guidance": {
    "recommended_strategy": "Master foundational unit 1 concepts first.",
    "high_priority_topics": ["Topic A", "Topic B"],
    "topics_requiring_prerequisites": [],
    "potentially_difficult_areas": ["Topic C"]
  }
}

Syllabus Text:
"""


class GeminiSyllabusExtractor:
    """
    Integrates with Google Gemini API to transform unstructured syllabus text into validated Pydantic models.
    Falls back gracefully to LocalSyllabusParser if Gemini is not configured or fails.
    Filters boilerplate noise and validates topic integrity post-extraction.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        if self.api_key and GENAI_AVAILABLE:
            try:
                genai.configure(api_key=self.api_key)
            except Exception:
                pass

    def is_configured(self) -> bool:
        return bool(self.api_key and GENAI_AVAILABLE)

    def extract_syllabus(self, text: str, fallback_subject_name: Optional[str] = None) -> Syllabus:
        """
        Send syllabus text to Gemini and parse the response into a validated Syllabus object.
        If Gemini is unavailable or fails, use LocalSyllabusParser so uploaded PDFs always work.
        """
        if not self.is_configured():
            return LocalSyllabusParser.parse(text, default_subject_name=fallback_subject_name)

        model = genai.GenerativeModel("gemini-1.5-flash")
        truncated_text = text[:30000]
        prompt = SYLLABUS_EXTRACTION_PROMPT + "\n" + truncated_text

        try:
            response = model.generate_content(prompt)
            raw_content = response.text.strip()

            clean_json_str = raw_content
            if "```" in clean_json_str:
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_json_str)
                if match:
                    clean_json_str = match.group(1).strip()

            parsed_data = json.loads(clean_json_str)
            syllabus = Syllabus.model_validate(parsed_data)

            # Post-Extraction Sanitization & Anti-Noise Guard
            syllabus = self._post_process_syllabus(syllabus, text, fallback_subject_name)
            return syllabus
        except Exception:
            return LocalSyllabusParser.parse(text, default_subject_name=fallback_subject_name)

    def _post_process_syllabus(
        self, syllabus: Syllabus, raw_text: str, fallback_subject_name: Optional[str]
    ) -> Syllabus:
        """
        Cleans any noise topics that slipped past AI, ensures deduplication, and validates acyclic prerequisites.
        """
        if not syllabus.subjects:
            return LocalSyllabusParser.parse(raw_text, default_subject_name=fallback_subject_name)

        for subject in syllabus.subjects:
            clean_topics = []
            for t in subject.topics:
                # Validate that topic is a real academic concept
                if LocalSyllabusParser.is_valid_academic_topic(t.name):
                    # Clamp descriptions
                    if t.description and len(t.description.split()) > 35:
                        t.description = " ".join(t.description.split()[:28]) + "."
                    if t.why_it_matters and len(t.why_it_matters.split()) > 30:
                        t.why_it_matters = " ".join(t.why_it_matters.split()[:22]) + "."
                    clean_topics.append(t)

            # Deduplicate and ensure acyclic prerequisites
            subject.topics = LocalSyllabusParser._deduplicate_topics(clean_topics)
            subject.topics = LocalSyllabusParser._assign_safe_prerequisites(subject.topics)

        # Recompute overall analysis
        all_topics = syllabus.subjects[0].topics if syllabus.subjects else []
        if all_topics:
            syllabus.overall_analysis = OverallAnalysis(
                total_topics=len(all_topics),
                estimated_hours=round(sum(t.estimated_hours for t in all_topics), 1),
                easy_topics=sum(1 for t in all_topics if t.difficulty == "easy"),
                medium_topics=sum(1 for t in all_topics if t.difficulty == "medium"),
                hard_topics=sum(1 for t in all_topics if t.difficulty == "hard"),
            )

        return syllabus

    def ask_syllabus_question(self, syllabus: Syllabus, question: str) -> str:
        """
        Answers student queries bounded strictly to the uploaded syllabus context.
        """
        if not self.is_configured():
            return LocalSyllabusParser.answer_question_locally(syllabus, question)

        model = genai.GenerativeModel("gemini-1.5-flash")
        syllabus_summary = json.dumps(syllabus.model_dump(exclude={"exam_dates", "coursework_deadlines"}), indent=2)

        prompt = f"""
You are a dedicated, encouraging StudyRoute academic mentor for a student studying this specific curriculum.
Answer the student's question accurately, concisely, and insightfully based ONLY on the provided syllabus data.

Rules:
1. Ground your answer strictly in the syllabus topics, units, prerequisites, and difficulties provided.
2. Keep responses focused, encouraging, and actionable (2-4 clear paragraphs or bullet points).
3. If asked "What should I study first?", reference the foundational topics with zero prerequisites.
4. Do not invent topics or dates that do not exist in the syllabus.

Syllabus Context:
{syllabus_summary}

Student Question:
"{question}"
"""
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return LocalSyllabusParser.answer_question_locally(syllabus, question)

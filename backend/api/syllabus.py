import json
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse

try:
    from ..models.syllabus import Syllabus, OverallAnalysis, StudyGuidance
    from ..services.pdf_parser import PDFParser, PDFParsingError, ScannedPDFError
    from ..services.gemini import GeminiSyllabusExtractor
except (ImportError, ValueError):
    from models.syllabus import Syllabus, OverallAnalysis, StudyGuidance
    from services.pdf_parser import PDFParser, PDFParsingError, ScannedPDFError
    from services.gemini import GeminiSyllabusExtractor

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

SAMPLE_SYLLABUS_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_syllabus.json"


class SyllabusQuestionRequest(BaseModel):
    syllabus: Syllabus
    question: str = Field(..., min_length=2, description="Question about the syllabus")


class SyllabusQuestionResponse(BaseModel):
    question: str
    answer: str


def load_sample_syllabus() -> Syllabus:
    if not SAMPLE_SYLLABUS_PATH.exists():
        raise HTTPException(status_code=500, detail="Sample syllabus file not found on server.")
    with open(SAMPLE_SYLLABUS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    syllabus = Syllabus.model_validate(data)
    # Ensure overall analysis is populated
    if not syllabus.overall_analysis or syllabus.overall_analysis.total_topics == 0:
        all_topics = syllabus.subjects[0].topics if syllabus.subjects else []
        tot_hrs = sum(t.estimated_hours for t in all_topics)
        syllabus.overall_analysis = OverallAnalysis(
            total_topics=len(all_topics),
            estimated_hours=round(tot_hrs, 1),
            easy_topics=sum(1 for t in all_topics if t.difficulty == "easy"),
            medium_topics=sum(1 for t in all_topics if t.difficulty == "medium"),
            hard_topics=sum(1 for t in all_topics if t.difficulty == "hard"),
        )
    if not syllabus.study_guidance or not syllabus.study_guidance.recommended_strategy:
        all_topics = syllabus.subjects[0].topics if syllabus.subjects else []
        hard = [t.name for t in all_topics if t.difficulty == "hard"]
        syllabus.study_guidance = StudyGuidance(
            recommended_strategy=(
                "Master Object-Oriented principles and Java syntax in Unit 1 before tackling "
                "Data Structures and Spring Framework APIs. Maintain dedicated hands-on coding blocks."
            ),
            high_priority_topics=[t.name for t in all_topics if t.importance == "high"][:4],
            topics_requiring_prerequisites=[t.name for t in all_topics if t.prerequisites][:4],
            potentially_difficult_areas=hard[:4]
        )
    if not syllabus.summary:
        syllabus.summary = (
            "Complete University Computer Science curriculum covering Java Foundations, "
            "Object-Oriented Design, Data Structures & Algorithms, and Enterprise Spring REST APIs."
        )
    return syllabus


@router.get("/sample", response_model=Syllabus)
async def get_sample_syllabus():
    """Return pre-structured university sample syllabus for instant demo mode."""
    return load_sample_syllabus()


@router.post("/upload", response_model=Syllabus)
async def upload_syllabus(
    file: Optional[UploadFile] = File(None),
    use_demo: Optional[bool] = Form(False),
):
    """
    Upload and deeply analyze syllabus from PDF using PyMuPDF and Gemini (or local structural NLP).
    Returns complete structured syllabus with topic explanations, difficulty ratings, and study guidance.
    """
    if use_demo:
        return load_sample_syllabus()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided. Please upload a PDF syllabus or enable 'use_demo'."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents (.pdf) are supported."
        )

    try:
        content = await file.read()
        extracted_text = PDFParser.extract_text_from_bytes(content)
    except ScannedPDFError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except PDFParsingError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"PDF extraction error: {str(e)}")

    # Extract & Understand with Gemini (or LocalSyllabusParser fallback)
    extractor = GeminiSyllabusExtractor()
    fallback_subject = file.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    try:
        syllabus = extractor.extract_syllabus(extracted_text, fallback_subject_name=fallback_subject)
        return syllabus
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Syllabus extraction failed: {str(e)}"
        )


@router.post("/ask", response_model=SyllabusQuestionResponse)
async def ask_syllabus_question(req: SyllabusQuestionRequest):
    """
    Answer student queries about the uploaded syllabus strictly within its academic context.
    """
    extractor = GeminiSyllabusExtractor()
    try:
        answer = extractor.ask_syllabus_question(req.syllabus, req.question)
        return SyllabusQuestionResponse(question=req.question, answer=answer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {str(e)}"
        )

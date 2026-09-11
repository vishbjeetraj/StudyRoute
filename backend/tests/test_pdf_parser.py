import pytest
import fitz
from ..services.pdf_parser import PDFParser, PDFParsingError


def create_sample_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_extract_valid_pdf():
    sample_text = "CS101 Introduction to Computer Science\nUnit 1: Java Basics\nUnit 2: Object-Oriented Programming"
    pdf_bytes = create_sample_pdf_bytes(sample_text)
    extracted = PDFParser.extract_text_from_bytes(pdf_bytes)
    assert "Java Basics" in extracted
    assert "Object-Oriented Programming" in extracted


def test_extract_empty_bytes():
    with pytest.raises(PDFParsingError) as exc_info:
        PDFParser.extract_text_from_bytes(b"")
    assert "empty" in str(exc_info.value).lower()


def test_extract_invalid_pdf_format():
    with pytest.raises(PDFParsingError) as exc_info:
        PDFParser.extract_text_from_bytes(b"Not a real PDF file contents here")
    assert "invalid file format" in str(exc_info.value).lower()

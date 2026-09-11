import io
import re
from typing import List, Set
from collections import Counter
import fitz  # PyMuPDF


class PDFParsingError(Exception):
    pass


class ScannedPDFError(PDFParsingError):
    """Raised when an uploaded PDF consists of images/scans without machine-readable text."""
    pass


class PDFParser:
    """
    Service for parsing text from PDF syllabus documents using PyMuPDF.
    Handles valid PDFs, empty PDFs, extraction errors, scanned image PDFs,
    and aggressively filters document boilerplate, repeated headers/footers,
    URLs, timestamps, and navigation noise.
    """

    BOILERPLATE_PATTERNS = [
        r"(?i)this\s+is\s+a\s+single\s*(?:concatenated)?\s*file.*",
        r"(?i)this\s+module\s+is\s+also\s+available\s+as\s+a\s+concatenated.*",
        r"(?i)suitable\s+for\s+printing\s+or\s+saving\s+as\s+a\s+pdf.*",
        r"(?i)missing\s+content\s+pages.*",
        r"(?i)click\s+here\s+to\s+(?:download|view|print|access).*",
        r"(?i)download(?:ed)?\s+(?:from|pdf|file).*",
        r"(?i)print(?:ed)?\s+this\s+(?:page|document|syllabus).*",
        r"(?i)copyright\s+(?:©|\(c\)|&copy;).*?(?:\d{4}|$)",
        r"(?i)all\s+rights\s+reserved.*",
        r"(?i)terms\s+of\s+(?:use|service).*privacy\s+policy.*",
        r"(?i)page\s+\d+\s+(?:of\s+\d+|/\s*\d+)",
        r"(?i)^\s*page\s+\d+\s*$",
        # Timestamps / Zoom meeting schedules like "7:00-8:30 PM ET" or "00-8-30-pm-et"
        r"^\s*(?:\d{1,2}[:\.]\d{2}\s*(?:am|pm)?\s*-\s*)?\d{1,2}[:\.]\d{2}\s*(?:am|pm)\s*(?:et|est|edt|pt|pst|pdt|cst|cdt|utc|gmt)?\s*$",
        r"^\s*\d{1,2}-\d{1,2}-\d{2,4}\s*(?:am|pm)?.*$",
        r"^\s*https?://\S+\s*$",
        r"^\s*www\.\S+\s*$",
    ]

    @classmethod
    def clean_text(cls, raw_pages: List[List[str]]) -> str:
        """
        Takes raw lines grouped by page, filters headers, footers, boilerplate,
        and returns clean normalized academic text.
        """
        if not raw_pages:
            return ""

        total_pages = len(raw_pages)
        header_counter = Counter()
        footer_counter = Counter()

        # Step 1: Detect repeated headers and footers across pages
        for page_lines in raw_pages:
            if not page_lines:
                continue
            # First 2 non-empty lines
            for line in page_lines[:2]:
                l_strip = line.strip().lower()
                if len(l_strip) > 4:
                    header_counter[l_strip] += 1
            # Last 2 non-empty lines
            for line in page_lines[-2:]:
                l_strip = line.strip().lower()
                if len(l_strip) > 4:
                    footer_counter[l_strip] += 1

        repeated_headers: Set[str] = {
            line for line, count in header_counter.items() if count >= max(2, int(total_pages * 0.4))
        }
        repeated_footers: Set[str] = {
            line for line, count in footer_counter.items() if count >= max(2, int(total_pages * 0.4))
        }

        compiled_boilerplate = [re.compile(p) for p in cls.BOILERPLATE_PATTERNS]
        cleaned_pages: List[str] = []

        for page_lines in raw_pages:
            cleaned_page_lines: List[str] = []
            for line in page_lines:
                stripped = line.strip()
                if not stripped:
                    continue

                lower_stripped = stripped.lower()

                # Check repeated header or footer
                if lower_stripped in repeated_headers or lower_stripped in repeated_footers:
                    continue

                # Check boilerplate regex
                if any(p.match(stripped) for p in compiled_boilerplate):
                    continue

                # Remove inline URLs
                stripped = re.sub(r"https?://\S+", "", stripped).strip()
                stripped = re.sub(r"www\.\S+", "", stripped).strip()

                # Filter out lines that have less than 2 alphabetic characters (e.g. "---", "###", "1.2.3")
                alpha_chars = sum(1 for c in stripped if c.isalpha())
                if alpha_chars < 2 and not re.search(r"\d", stripped):
                    continue

                # Normalize intra-line whitespace
                stripped = re.sub(r"[ \t]+", " ", stripped)

                if stripped:
                    cleaned_page_lines.append(stripped)

            if cleaned_page_lines:
                cleaned_pages.append("\n".join(cleaned_page_lines))

        return "\n\n".join(cleaned_pages).strip()

    @classmethod
    def extract_text_from_bytes(cls, file_bytes: bytes) -> str:
        """
        Extract and sanitize text from raw PDF bytes.
        """
        if not file_bytes or len(file_bytes.strip()) == 0:
            raise PDFParsingError("Uploaded file is empty. Please provide a valid PDF document.")

        try:
            if not file_bytes.startswith(b"%PDF"):
                raise PDFParsingError("Invalid file format: File does not appear to be a valid PDF.")

            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            if isinstance(e, PDFParsingError):
                raise e
            raise PDFParsingError(f"Could not open PDF document: {str(e)}")

        if doc.is_encrypted:
            doc.close()
            raise PDFParsingError("Password-protected PDFs are not supported. Please upload an unlocked PDF.")

        if doc.page_count == 0:
            doc.close()
            raise PDFParsingError("PDF document contains 0 pages.")

        raw_pages: List[List[str]] = []
        total_raw_chars = 0

        for page_num in range(doc.page_count):
            try:
                page = doc.load_page(page_num)
                text = page.get_text("text")
                if text and text.strip():
                    lines = [l.strip() for l in text.splitlines() if l.strip()]
                    raw_pages.append(lines)
                    total_raw_chars += len(text)
                else:
                    raw_pages.append([])
            except Exception:
                raw_pages.append([])

        doc.close()

        # Scanned PDF detection: if total extracted characters across all pages is < 50
        if total_raw_chars < 50:
            raise ScannedPDFError(
                "This PDF appears to be scanned or image-based. StudyRoute requires a text-based PDF "
                "to reliably extract your syllabus. Please upload a standard digital syllabus PDF."
            )

        clean_text = cls.clean_text(raw_pages)
        if not clean_text or len(clean_text) < 40:
            raise ScannedPDFError(
                "No readable academic text remained after removing document metadata and boilerplate. "
                "Please ensure the uploaded PDF contains text-based syllabus content."
            )

        return clean_text

    @classmethod
    def extract_text_from_file_path(cls, file_path: str) -> str:
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            return cls.extract_text_from_bytes(content)
        except FileNotFoundError:
            raise PDFParsingError(f"File not found at path: {file_path}")

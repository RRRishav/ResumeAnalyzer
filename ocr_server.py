"""
Resume OCR Server
Converts resume PDFs to images, sends to Groq Vision API for OCR extraction,
and serves results via a Flask API that the React frontend calls.

Usage:
    pip install -r requirements_ocr.txt
    python ocr_server.py
    python ocr_server.py --port 8000
"""

import os
import sys
import io
import json
import base64
import time
import argparse
import tempfile
from datetime import datetime

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from groq import Groq
import fitz  # PyMuPDF

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONFIG
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROQ_API_KEY = "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"
VISION_MODEL = "llama-3.2-90b-vision-preview"
TEXT_MODEL = "llama-3.3-70b-versatile"
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "ocr_uploads")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = Groq(api_key=GROQ_API_KEY)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"])

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  EXTRACTION PROMPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACT_PROMPT = """You are an expert resume OCR parser. Look at this resume image carefully and extract ALL important details.

Return ONLY valid JSON — no explanation, no markdown fences.

Extract this EXACT structure:
{
  "name": "<full name or null>",
  "email": "<email address or null>",
  "phone": "<phone number with country code or null>",
  "location": "<city, state or null>",
  "professional_summary": "<2-3 line summary or null>",
  "total_experience": "<e.g. 3+ years or null>",
  "links": {
    "github": "<GitHub URL or null>",
    "linkedin": "<LinkedIn URL or null>",
    "portfolio": "<portfolio URL or null>",
    "other": ["<other URLs>"]
  },
  "degree": "<highest degree like B.Tech, BCA, MCA or null>",
  "stream": "<branch like CSE, IT, ECE or null>",
  "cgpa": "<CGPA or percentage or null>",
  "tenth_marks": "<10th marks/percentage or null>",
  "twelfth_marks": "<12th marks/percentage or null>",
  "education": [{"degree": "<degree>", "institution": "<college>", "stream": "<branch>", "score": "<CGPA/%>", "duration": "<years>"}],
  "skills": ["<skill1>", "<skill2>", "<skill3>"],
  "projects": [{"title": "<name>", "description": "<1-line desc>", "tech_stack": ["<tech>"]}],
  "certifications": [{"name": "<cert>", "issuer": "<org or null>", "year": "<year or null>"}],
  "experience": [{"role": "<title>", "company": "<company>", "duration": "<period>", "description": "<brief desc>"}],
  "achievements": ["<achievement1>", "<achievement2>"],
  "languages": ["<lang1>", "<lang2>"]
}"""

MERGE_PROMPT = """You are an expert resume data merger. I have extracted resume data from multiple pages of the same resume.
Merge them into a single clean JSON. Remove duplicates. Combine skills, projects, experience etc.
If same field appears multiple times, keep the most complete version.

Return ONLY valid JSON — no explanation, no markdown.

Use this exact structure:
{
  "name": "<full name or null>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "location": "<location or null>",
  "professional_summary": "<summary or null>",
  "total_experience": "<experience or null>",
  "links": {"github": null, "linkedin": null, "portfolio": null, "other": []},
  "degree": "<degree or null>",
  "stream": "<stream or null>",
  "cgpa": "<cgpa or null>",
  "tenth_marks": "<marks or null>",
  "twelfth_marks": "<marks or null>",
  "education": [],
  "skills": [],
  "projects": [{"title": "", "description": "", "tech_stack": []}],
  "certifications": [{"name": "", "issuer": null, "year": null}],
  "experience": [{"role": "", "company": "", "duration": "", "description": ""}],
  "achievements": [],
  "languages": []
}"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PDF → IMAGES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def pdf_to_images(pdf_path, dpi=200):
    """Convert PDF pages to PNG images using PyMuPDF. Returns list of base64 strings."""
    doc = fitz.open(pdf_path)
    images = []
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    for page_num in range(min(len(doc), 5)):  # Max 5 pages
        page = doc[page_num]
        pix = page.get_pixmap(matrix=matrix)

        # Convert to PNG bytes
        img_bytes = pix.tobytes("png")

        # Check size — Groq limit is 4MB per base64 image
        if len(img_bytes) > 3 * 1024 * 1024:
            # Re-render at lower DPI
            lower_matrix = fitz.Matrix(150 / 72, 150 / 72)
            pix = page.get_pixmap(matrix=lower_matrix)
            img_bytes = pix.tobytes("png")

        b64 = base64.b64encode(img_bytes).decode("utf-8")
        images.append({"page": page_num + 1, "base64": b64, "size_kb": len(img_bytes) / 1024})

    doc.close()
    return images


def image_to_base64(image_path):
    """Convert an image file to base64."""
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    return base64.b64encode(img_bytes).decode("utf-8")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GROQ VISION OCR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def ocr_extract_page(image_base64, page_num=1):
    """Send a single page image to Groq Vision for OCR extraction."""
    try:
        print(f"    → OCR page {page_num} via Groq Vision ({VISION_MODEL})...")

        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACT_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}"
                            },
                        },
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=2000,
        )

        raw = response.choices[0].message.content.strip()
        return parse_json_response(raw)

    except Exception as e:
        print(f"    ✗ OCR error on page {page_num}: {e}")
        return None


def merge_page_results(page_results):
    """Merge extraction results from multiple pages using Groq text model."""
    valid = [r for r in page_results if r is not None]

    if not valid:
        return get_empty_result()

    if len(valid) == 1:
        return valid[0]

    try:
        combined_json = json.dumps(valid, indent=2, default=str)
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": MERGE_PROMPT},
                {"role": "user", "content": f"Merge these page extractions:\n\n{combined_json}"},
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        return parse_json_response(raw) or valid[0]
    except Exception as e:
        print(f"    ✗ Merge error: {e}")
        return valid[0]


def extract_from_text(text):
    """Fallback: extract resume data from raw text using Groq text model."""
    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": EXTRACT_PROMPT.replace("Look at this resume image carefully and extract", "Extract")},
                {"role": "user", "content": f"Extract resume details from this text:\n\n{text[:6000]}"},
            ],
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        return parse_json_response(raw)
    except Exception as e:
        print(f"    ✗ Text extraction error: {e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def parse_json_response(text):
    """Parse JSON from LLM response, handling markdown fences."""
    cleaned = text.replace("```json", "").replace("```", "").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError:
        try:
            fixed = cleaned[start : end + 1].replace(",}", "}").replace(",]", "]")
            return json.loads(fixed)
        except:
            return None


def get_empty_result():
    return {
        "name": None, "email": None, "phone": None, "location": None,
        "professional_summary": None, "total_experience": None,
        "links": {"github": None, "linkedin": None, "portfolio": None, "other": []},
        "degree": None, "stream": None, "cgpa": None,
        "tenth_marks": None, "twelfth_marks": None,
        "education": [], "skills": [], "projects": [],
        "certifications": [], "experience": [],
        "achievements": [], "languages": [],
    }


def extract_text_from_pdf(pdf_path):
    """Extract raw text from PDF using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text.strip()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MAIN EXTRACTION PIPELINE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def process_resume(file_path, filename="resume"):
    """Full pipeline: PDF → images → OCR → merge → return JSON."""
    start_time = time.time()
    ext = os.path.splitext(file_path)[1].lower()

    print(f"\n  📄 Processing: {filename}")

    if ext == ".pdf":
        # Step 1: Convert PDF to images
        print(f"    → Converting PDF to images...")
        images = pdf_to_images(file_path)
        print(f"    ✓ {len(images)} page(s) converted")

        # Step 2: OCR each page via Groq Vision
        page_results = []
        for img in images:
            result = ocr_extract_page(img["base64"], img["page"])
            page_results.append(result)
            time.sleep(0.5)  # Rate limit

        # Step 3: Merge results
        if len(page_results) > 1:
            print(f"    → Merging {len(page_results)} pages...")
            extracted = merge_page_results(page_results)
        elif page_results and page_results[0]:
            extracted = page_results[0]
        else:
            # Fallback: try text extraction
            print(f"    → Vision failed, trying text extraction...")
            text = extract_text_from_pdf(file_path)
            extracted = extract_from_text(text) if text else get_empty_result()

    elif ext in (".png", ".jpg", ".jpeg"):
        # Direct image OCR
        print(f"    → OCR on image file...")
        b64 = image_to_base64(file_path)
        extracted = ocr_extract_page(b64, 1) or get_empty_result()

    elif ext == ".txt":
        print(f"    → Text file, using text extraction...")
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        extracted = extract_from_text(text) or get_empty_result()

    elif ext in (".docx", ".doc"):
        print(f"    → DOCX file, extracting text...")
        try:
            from docx import Document
            doc = Document(file_path)
            text = "\n".join(p.text for p in doc.paragraphs)
            extracted = extract_from_text(text) or get_empty_result()
        except Exception as e:
            print(f"    ✗ DOCX error: {e}")
            extracted = get_empty_result()
    else:
        extracted = get_empty_result()

    elapsed = time.time() - start_time
    name = extracted.get("name", "Unknown") if extracted else "Unknown"
    skills_count = len(extracted.get("skills", [])) if extracted else 0
    print(f"    ✓ Extracted: {name} | {skills_count} skills | {elapsed:.1f}s")

    return {
        "extracted_data": extracted or get_empty_result(),
        "filename": filename,
        "processing_time_ms": int(elapsed * 1000),
        "model_used": VISION_MODEL if ext == ".pdf" else TEXT_MODEL,
        "pages_processed": len(images) if ext == ".pdf" else 1,
        "method": "vision_ocr" if ext in (".pdf", ".png", ".jpg", ".jpeg") else "text_extraction",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  FLASK API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@app.route("/api/ocr/health", methods=["GET"])
def health():
    """Health check."""
    try:
        models = client.models.list()
        vision_ok = any(m.id == VISION_MODEL for m in models.data) if models.data else False
        return jsonify({
            "healthy": True,
            "vision_model": VISION_MODEL,
            "text_model": TEXT_MODEL,
            "vision_available": vision_ok,
            "provider": "Groq Cloud (Vision OCR)",
        })
    except Exception as e:
        return jsonify({"healthy": False, "error": str(e)}), 500


@app.route("/api/ocr/extract", methods=["POST"])
def extract():
    """Accept a resume file upload and return OCR-extracted data."""
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded. Send a file with key 'resume'."}), 400

    file = request.files["resume"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {ext}. Use PDF, DOCX, TXT, or images."}), 400

    # Save to temp
    safe_name = secure_filename(file.filename)
    temp_name = f"ocr_{int(time.time())}_{safe_name}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_name)

    try:
        file.save(temp_path)

        # Check size
        if os.path.getsize(temp_path) > MAX_FILE_SIZE:
            os.unlink(temp_path)
            return jsonify({"error": "File too large. Maximum 10MB."}), 400

        # Process
        result = process_resume(temp_path, file.filename)

        return jsonify({
            "success": True,
            "extraction": result,
        })

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Cleanup
        try:
            os.unlink(temp_path)
        except:
            pass


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MAIN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Resume OCR Server — Groq Vision API")
    parser.add_argument("--port", type=int, default=8000, help="Port to run on (default: 8000)")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  🔍 Resume OCR Server")
    print(f"  🤖 Vision Model: {VISION_MODEL}")
    print(f"  📝 Text Model:   {TEXT_MODEL}")
    print(f"  🌐 Server:       http://localhost:{args.port}")
    print(f"  📂 Uploads:      {UPLOAD_FOLDER}")
    print(f"{'='*60}\n")

    app.run(host=args.host, port=args.port, debug=True)

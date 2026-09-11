# StudyRoute — Adaptive Study Planning & Intelligent Schedule Rerouting

> **"Your study plan should adapt to your reality."**  
> *Technical Philosophy:* **AI Extracts. Algorithms Decide.**  
> *Positioning:* **StudyRoute — Google Maps for Studying.**

---

## 🧭 About StudyRoute

Static study plans break the moment reality intervenes. When a student misses a session, spends longer on a tough concept, has an exam moved forward, or receives a surprise coursework assignment, traditional static spreadsheets and fixed calendars collapse into guilt and chaos.

**StudyRoute** treats your study plan like a GPS route:
- When traffic delays you, Google Maps recalculates the route.
- When life happens, **StudyRoute** dynamically reroutes your remaining study schedule.

### ⚡ Architectural Rule: "AI Extracts. Algorithms Decide."
1. **Gemini AI** extracts syllabus structures from PDFs (subjects, topics, difficulties, hours, prerequisites, deadlines) into validated JSON schemas.
2. **Deterministic Python Graph Solver** constructs the directed dependency graph, performs topological sorting, detects circular dependencies, and scores topic priorities.
3. **Deterministic Scheduler & Rerouter** calculates and recalculates the schedule respecting available hours, prerequisites, rest days, and deadlines—with zero random heuristics or LLM hallucinations.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Lucide Icons, Modern Vanilla CSS (Dark Navy & Glassmorphism design system).
- **Backend**: Python 3.9+, FastAPI, Pydantic v2, PyMuPDF (fitz), Uvicorn, python-multipart, python-dotenv, Google GenAI SDK.
- **Graph & Scheduling**: Python Directed Graph, Topological Sort (Kahn's algorithm), deterministic multi-constraint priority allocation.
- **Testing**: Pytest automated test suite.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 🧪 Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest -q
```

---

## 📜 Supported Disruptions
1. **Missed Session**: Recalculates remaining plan preserving completed work without blindly shifting all future sessions.
2. **Topic Took Longer**: Accommodates extra duration and adjusts downstream prerequisites.
3. **Changed Exam Date**: Compresses or re-interleaves study sessions to meet urgent revised deadlines.
4. **New Coursework Added**: Dynamically injects new nodes and dependencies into the graph and regenerates optimal paths.

import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Ensure backend root directory is in sys.path for direct uvicorn launches
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv()

try:
    from .api.syllabus import router as syllabus_router
    from .api.schedule import router as schedule_router
    from .api.disruption import router as disruption_router
    from .api.dashboard import router as dashboard_router
except (ImportError, ValueError):
    from api.syllabus import router as syllabus_router
    from api.schedule import router as schedule_router
    from api.disruption import router as disruption_router
    from api.dashboard import router as dashboard_router

app = FastAPI(
    title="StudyRoute API",
    description="Adaptive Study Planning & Intelligent Schedule Rerouting Engine. AI Extracts. Algorithms Decide.",
    version="1.0.0",
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(syllabus_router)
app.include_router(schedule_router)
app.include_router(disruption_router)
app.include_router(dashboard_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "StudyRoute Backend",
        "tagline": "AI Extracts. Algorithms Decide.",
        "version": "1.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Clean global exception handler without leaking stack traces."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"An unexpected error occurred: {str(exc)}"},
    )

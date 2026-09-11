from .syllabus import router as syllabus_router
from .schedule import router as schedule_router
from .disruption import router as disruption_router
from .dashboard import router as dashboard_router

__all__ = ["syllabus_router", "schedule_router", "disruption_router", "dashboard_router"]

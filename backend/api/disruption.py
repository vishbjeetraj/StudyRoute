import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

try:
    from ..models.disruption import DisruptionRequest, RerouteResponse
    from ..solver.rerouter import Rerouter
    from ..solver.graph import CircularDependencyError
    from . import schedule as schedule_api
except (ImportError, ValueError):
    from models.disruption import DisruptionRequest, RerouteResponse
    from solver.rerouter import Rerouter
    from solver.graph import CircularDependencyError
    import api.schedule as schedule_api

router = APIRouter(prefix="/api/disruption", tags=["Disruption"])

# History of reroutes for dashboard logging
_reroute_history: List[Dict[str, Any]] = []


def get_reroute_history() -> List[Dict[str, Any]]:
    return list(reversed(_reroute_history))


@router.post("/reroute", response_model=RerouteResponse)
async def reroute_plan(request: DisruptionRequest):
    """
    Recalculate study schedule dynamically when student reality changes.
    Supported disruption types:
    - missed_session
    - topic_took_longer
    - changed_exam_date
    - new_coursework
    """
    rerouter = Rerouter()
    try:
        response = rerouter.generate_new_plan(request)

        # Update in-memory active plan
        schedule_api._current_active_plan = response.new_plan

        # Log in history
        _reroute_history.append({
            "id": f"reroute-{len(_reroute_history) + 1:03d}",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "type": request.disruption_type,
            "moved": response.moved_count,
            "changed": response.changed_count,
            "new": response.new_count,
            "summary": response.explanation.what_changed,
        })

        return response
    except CircularDependencyError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot reroute due to circular dependency: {' -> '.join(e.cycle)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Adaptive rerouting calculation failed: {str(e)}"
        )

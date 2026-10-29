from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.dependencies import employee_filters
from app.schemas.analytics import AnalyticsSummary
from app.services import analytics_service, summary_cache
from app.services.filters import EmployeeFilters

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(
    db: Annotated[Session, Depends(get_db)],
    filters: Annotated[EmployeeFilters, Depends(employee_filters)],
):
    return summary_cache.get_or_compute(filters, lambda: analytics_service.summary(db, filters))

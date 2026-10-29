from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.dependencies import employee_filters
from app.schemas.analytics import AnalyticsSummary
from app.services import analytics_service
from app.services.filters import EmployeeFilters

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(
    db: Annotated[Session, Depends(get_db)],
    filters: Annotated[EmployeeFilters, Depends(employee_filters)],
):
    return analytics_service.summary(db, filters)

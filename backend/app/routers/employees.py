from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.dependencies import employee_filters
from app.schemas.common import Page
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeDetail,
    EmployeeListItem,
    EmployeeSortField,
    EmployeeUpdate,
    SortOrder,
)
from app.services import employee_service
from app.services.employee_service import MAX_PAGE_SIZE
from app.services.filters import EmployeeFilters

router = APIRouter(prefix="/api/employees", tags=["employees"])
DB = Annotated[Session, Depends(get_db)]


@router.get("", response_model=Page[EmployeeListItem])
def list_employees(
    db: DB,
    filters: Annotated[EmployeeFilters, Depends(employee_filters)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 25,
    sort_by: EmployeeSortField = EmployeeSortField.LAST_NAME,
    sort_order: SortOrder = SortOrder.ASC,
):
    if (
        filters.min_salary_usd is not None
        and filters.max_salary_usd is not None
        and filters.min_salary_usd > filters.max_salary_usd
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "min_salary cannot be greater than max_salary")
    return employee_service.list_employees(db, filters, page, page_size, sort_by, sort_order)


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee(employee_id: int, db: DB):
    return employee_service.get_employee(db, employee_id)


@router.post("", response_model=EmployeeDetail, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate, db: DB):
    return employee_service.create_employee(db, payload)


@router.patch("/{employee_id}", response_model=EmployeeDetail)
def update_employee(employee_id: int, payload: EmployeeUpdate, db: DB):
    return employee_service.update_employee(db, employee_id, payload)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: DB) -> None:
    employee_service.delete_employee(db, employee_id)

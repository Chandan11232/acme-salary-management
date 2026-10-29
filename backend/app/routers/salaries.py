from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.salary import SalaryCreate, SalaryOut, SalaryUpdate
from app.services import salary_service

router = APIRouter(prefix="/api", tags=["salaries"])
DB = Annotated[Session, Depends(get_db)]


@router.get("/employees/{employee_id}/salaries", response_model=list[SalaryOut])
def list_salaries(employee_id: int, db: DB):
    return salary_service.list_salaries(db, employee_id)


@router.post("/employees/{employee_id}/salaries", response_model=SalaryOut, status_code=status.HTTP_201_CREATED)
def create_salary(employee_id: int, payload: SalaryCreate, db: DB):
    return salary_service.create_salary(db, employee_id, payload)


@router.patch("/salaries/{salary_id}", response_model=SalaryOut)
def update_salary(salary_id: int, payload: SalaryUpdate, db: DB):
    return salary_service.update_salary(db, salary_id, payload)


@router.delete("/salaries/{salary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary(salary_id: int, db: DB) -> None:
    salary_service.delete_salary(db, salary_id)

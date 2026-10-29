from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Salary
from app.schemas.salary import SalaryCreate, SalaryOut, SalaryUpdate
from app.services.employee_service import get_employee_model
from app.services.errors import NotFoundError, UnprocessableError


def list_salaries(db: Session, employee_id: int) -> list[SalaryOut]:
    get_employee_model(db, employee_id)
    salaries = db.scalars(
        select(Salary)
        .where(Salary.employee_id == employee_id)
        .order_by(Salary.effective_date.desc(), Salary.id.desc())
    )
    return [SalaryOut.model_validate(s) for s in salaries]


def create_salary(db: Session, employee_id: int, payload: SalaryCreate) -> SalaryOut:
    get_employee_model(db, employee_id)
    salary = Salary(employee_id=employee_id, **payload.model_dump())
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return SalaryOut.model_validate(salary)


def _get_salary(db: Session, salary_id: int) -> Salary:
    salary = db.get(Salary, salary_id)
    if salary is None:
        raise NotFoundError(f"Salary record {salary_id} not found")
    return salary


def update_salary(db: Session, salary_id: int, payload: SalaryUpdate) -> SalaryOut:
    salary = _get_salary(db, salary_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        if value is None:
            raise UnprocessableError(f"{key} cannot be null")
        setattr(salary, key, value)
    db.commit()
    db.refresh(salary)
    return SalaryOut.model_validate(salary)


def delete_salary(db: Session, salary_id: int) -> None:
    db.delete(_get_salary(db, salary_id))
    db.commit()

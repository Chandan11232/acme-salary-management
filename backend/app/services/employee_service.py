from sqlalchemy import Row, Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, contains_eager, selectinload

from app.models import Country, Department, Employee, Salary
from app.schemas.common import Page
from app.schemas.employee import (
    CurrentCompensation,
    EmployeeCreate,
    EmployeeDetail,
    EmployeeListItem,
    EmployeeSortField,
    EmployeeUpdate,
    SortOrder,
)
from app.schemas.reference import CountryOut, DepartmentOut
from app.schemas.salary import SalaryOut
from app.services.compensation import current_compensation_subquery
from app.services.errors import ConflictError, InvalidReferenceError, NotFoundError, UnprocessableError
from app.services.filters import EmployeeFilters, apply_filters

MAX_PAGE_SIZE = 100


def _employee_with_comp_query(employee_ids: list[int] | None = None) -> tuple[Select, object]:
    comp = current_compensation_subquery(employee_ids)
    stmt = (
        select(Employee, comp)
        .join(Employee.department)
        .join(Employee.country)
        .outerjoin(comp, comp.c.employee_id == Employee.id)
        .options(contains_eager(Employee.department), contains_eager(Employee.country))
        # Refresh relationships of already-loaded instances (e.g. right after an update).
        .execution_options(populate_existing=True)
    )
    return stmt, comp


def _to_list_item(row: Row) -> EmployeeListItem:
    employee: Employee = row[0]
    mapping = row._mapping
    comp = None
    if mapping["employee_id"] is not None:
        comp = CurrentCompensation(
            base_salary=mapping["base_salary"],
            bonus=mapping["bonus"],
            pay_frequency=mapping["pay_frequency"],
            effective_date=mapping["effective_date"],
            currency_code=mapping["currency_code"],
            annual_base_usd=round(mapping["annual_base_usd"], 2),
            total_comp_usd=round(mapping["total_comp_usd"], 2),
        )
    return EmployeeListItem(
        id=employee.id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        job_title=employee.job_title,
        hire_date=employee.hire_date,
        employment_type=employee.employment_type,
        department=DepartmentOut.model_validate(employee.department),
        country=CountryOut.model_validate(employee.country),
        current_compensation=comp,
    )


def list_employees(
    db: Session,
    filters: EmployeeFilters,
    page: int = 1,
    page_size: int = 25,
    sort_by: EmployeeSortField = EmployeeSortField.LAST_NAME,
    sort_order: SortOrder = SortOrder.ASC,
) -> Page[EmployeeListItem]:
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    page = max(page, 1)
    count_stmt = select(func.count(Employee.id))
    if filters.needs_compensation:
        count_comp = current_compensation_subquery()
        count_stmt = count_stmt.join(count_comp, count_comp.c.employee_id == Employee.id)
        count_stmt = apply_filters(count_stmt, filters, count_comp)
    else:
        count_stmt = apply_filters(count_stmt, filters)
    total = db.scalar(count_stmt) or 0

    def ordering(comp) -> list:
        sort_column = comp.c.annual_base_usd if sort_by == EmployeeSortField.SALARY else {
            EmployeeSortField.LAST_NAME: Employee.last_name,
            EmployeeSortField.FIRST_NAME: Employee.first_name,
            EmployeeSortField.HIRE_DATE: Employee.hire_date,
            EmployeeSortField.JOB_TITLE: Employee.job_title,
            EmployeeSortField.DEPARTMENT: Department.name,
            EmployeeSortField.COUNTRY: Country.country_name,
        }[sort_by]
        ordered = sort_column.desc() if sort_order == SortOrder.DESC else sort_column.asc()
        return [ordered.nulls_last(), Employee.id]

    if filters.needs_compensation or sort_by == EmployeeSortField.SALARY:
        # Salary filters and sorting need current pay for every candidate.
        stmt, comp = _employee_with_comp_query()
        stmt = apply_filters(stmt, filters, comp)
        stmt = stmt.order_by(*ordering(comp)).limit(page_size).offset((page - 1) * page_size)
    else:
        # Pick the page's employees first, then compute current pay for just those rows.
        ids_stmt = select(Employee.id).join(Employee.department).join(Employee.country)
        ids_stmt = apply_filters(ids_stmt, filters).order_by(*ordering(None)).limit(page_size).offset((page - 1) * page_size)
        page_ids = list(db.scalars(ids_stmt))
        stmt, comp = _employee_with_comp_query(page_ids)
        stmt = stmt.where(Employee.id.in_(page_ids)).order_by(*ordering(comp))

    items = [_to_list_item(row) for row in db.execute(stmt)]
    return Page.build(items, total, page, page_size)


def get_employee(db: Session, employee_id: int) -> EmployeeDetail:
    stmt, _ = _employee_with_comp_query([employee_id])
    row = db.execute(stmt.where(Employee.id == employee_id)).first()
    if row is None:
        raise NotFoundError(f"Employee {employee_id} not found")
    salaries = db.scalars(
        select(Salary)
        .where(Salary.employee_id == employee_id)
        .order_by(Salary.effective_date.desc(), Salary.id.desc())
    )
    return EmployeeDetail(
        **_to_list_item(row).model_dump(),
        salaries=[SalaryOut.model_validate(s) for s in salaries],
    )


def get_employee_model(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise NotFoundError(f"Employee {employee_id} not found")
    return employee


def _validate_references(db: Session, department_id: int | None, country_id: int | None) -> None:
    if department_id is not None and db.get(Department, department_id) is None:
        raise InvalidReferenceError(f"Department {department_id} does not exist")
    if country_id is not None and db.get(Country, country_id) is None:
        raise InvalidReferenceError(f"Country {country_id} does not exist")


def _ensure_email_available(db: Session, email: str, exclude_id: int | None = None) -> None:
    stmt = select(Employee.id).where(func.lower(Employee.email) == email.lower())
    if exclude_id is not None:
        stmt = stmt.where(Employee.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise ConflictError(f"An employee with email {email} already exists")


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("The change conflicts with existing data") from exc


def create_employee(db: Session, payload: EmployeeCreate) -> EmployeeDetail:
    _validate_references(db, payload.department_id, payload.country_id)
    _ensure_email_available(db, payload.email)
    employee = Employee(**payload.model_dump(exclude={"salary"}))
    if payload.salary is not None:
        employee.salaries.append(Salary(**payload.salary.model_dump()))
    db.add(employee)
    _commit(db)
    return get_employee(db, employee.id)


def update_employee(db: Session, employee_id: int, payload: EmployeeUpdate) -> EmployeeDetail:
    employee = get_employee_model(db, employee_id)
    changes = payload.model_dump(exclude_unset=True)
    for key in ("first_name", "last_name", "job_title", "email", "hire_date", "employment_type", "department_id", "country_id"):
        if key in changes and changes[key] is None:
            raise UnprocessableError(f"{key} cannot be null")
    _validate_references(db, changes.get("department_id"), changes.get("country_id"))
    if "email" in changes:
        _ensure_email_available(db, changes["email"], exclude_id=employee_id)
    for key, value in changes.items():
        setattr(employee, key, value.strip() if isinstance(value, str) and key != "email" else value)
    _commit(db)
    return get_employee(db, employee_id)


def delete_employee(db: Session, employee_id: int) -> None:
    employee = db.scalar(
        select(Employee).where(Employee.id == employee_id).options(selectinload(Employee.salaries))
    )
    if employee is None:
        raise NotFoundError(f"Employee {employee_id} not found")
    db.delete(employee)
    db.commit()

from typing import Annotated

from fastapi import Query

from app.models import EmploymentType
from app.services.filters import EmployeeFilters


def employee_filters(
    department_id: Annotated[list[int] | None, Query(description="Repeatable")] = None,
    country_id: Annotated[list[int] | None, Query(description="Repeatable")] = None,
    employment_type: Annotated[list[EmploymentType] | None, Query(description="Repeatable")] = None,
    search: Annotated[str | None, Query(max_length=100, description="Name, email or job title")] = None,
    min_salary: Annotated[float | None, Query(ge=0, description="Annual base salary, USD")] = None,
    max_salary: Annotated[float | None, Query(ge=0, description="Annual base salary, USD")] = None,
) -> EmployeeFilters:
    return EmployeeFilters(
        department_ids=department_id or [],
        country_ids=country_id or [],
        employment_types=employment_type or [],
        search=search,
        min_salary_usd=min_salary,
        max_salary_usd=max_salary,
    )

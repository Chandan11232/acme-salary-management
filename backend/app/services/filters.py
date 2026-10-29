from dataclasses import dataclass, field

from sqlalchemy import Select, Subquery, or_

from app.models import Employee, EmploymentType


@dataclass(frozen=True)
class EmployeeFilters:
    """Filters shared by the employee list, analytics and the AI assistant.

    Salary bounds apply to current annual base salary in USD.
    """

    department_ids: list[int] = field(default_factory=list)
    country_ids: list[int] = field(default_factory=list)
    employment_types: list[EmploymentType] = field(default_factory=list)
    search: str | None = None
    job_title_contains: str | None = None
    min_salary_usd: float | None = None
    max_salary_usd: float | None = None

    @property
    def needs_compensation(self) -> bool:
        return self.min_salary_usd is not None or self.max_salary_usd is not None


def apply_filters(stmt: Select, filters: EmployeeFilters, comp: Subquery | None = None) -> Select:
    """Add WHERE clauses for `filters`. `comp` must already be joined when salary bounds are set."""
    if filters.department_ids:
        stmt = stmt.where(Employee.department_id.in_(filters.department_ids))
    if filters.country_ids:
        stmt = stmt.where(Employee.country_id.in_(filters.country_ids))
    if filters.employment_types:
        stmt = stmt.where(Employee.employment_type.in_(filters.employment_types))
    if filters.job_title_contains:
        stmt = stmt.where(Employee.job_title.icontains(filters.job_title_contains, autoescape=True))
    if filters.search and (term := filters.search.strip()):
        stmt = stmt.where(
            or_(
                *(
                    column.icontains(term, autoescape=True)
                    for column in (Employee.first_name, Employee.last_name, Employee.email, Employee.job_title)
                ),
                (Employee.first_name + " " + Employee.last_name).icontains(term, autoescape=True),
            )
        )
    if filters.needs_compensation:
        if comp is None:
            raise ValueError("salary filters require the compensation subquery to be joined")
        if filters.min_salary_usd is not None:
            stmt = stmt.where(comp.c.annual_base_usd >= filters.min_salary_usd)
        if filters.max_salary_usd is not None:
            stmt = stmt.where(comp.c.annual_base_usd <= filters.max_salary_usd)
    return stmt

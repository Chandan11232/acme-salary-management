"""Compensation aggregates computed in SQL. All money values are annual USD."""

from collections.abc import Callable
from dataclasses import replace
from enum import StrEnum

from sqlalchemy import ColumnElement, Select, Subquery, Table, func, select
from sqlalchemy.orm import Session

from app.models import Country, Department, Employee
from app.schemas.analytics import AnalyticsSummary, GroupBreakdown
from app.services.compensation import (
    Measure,
    current_compensation_subquery,
    drop_snapshot,
    measure_column,
    snapshot_current_compensation,
)
from app.services.filters import EmployeeFilters, apply_filters


class Metric(StrEnum):
    AVG = "avg"
    SUM = "sum"
    MIN = "min"
    MAX = "max"
    MEDIAN = "median"
    COUNT = "count"


class GroupBy(StrEnum):
    DEPARTMENT = "department"
    COUNTRY = "country"
    EMPLOYMENT_TYPE = "employment_type"


_AGGREGATES = {Metric.AVG: func.avg, Metric.SUM: func.sum, Metric.MIN: func.min, Metric.MAX: func.max}


def _group_columns(group_by: GroupBy) -> tuple[ColumnElement, ColumnElement]:
    """(key, label) columns for a grouping."""
    return {
        GroupBy.DEPARTMENT: (Department.id, Department.name),
        GroupBy.COUNTRY: (Country.id, Country.country_name),
        GroupBy.EMPLOYMENT_TYPE: (Employee.employment_type, Employee.employment_type),
    }[group_by]


def _base(
    columns: Callable[[Subquery], list], filters: EmployeeFilters, salaried_only: bool, comp: Subquery | Table | None = None
) -> tuple[Select, Subquery]:
    """SELECT `columns(comp)` over filtered employees joined to department, country and current pay.

    `salaried_only` inner-joins compensation so employees without a salary record are excluded.
    `comp` defaults to the current-compensation subquery; pass a snapshot to reuse one.
    """
    if comp is None:
        comp = current_compensation_subquery()
    stmt = (
        select(*columns(comp))
        .select_from(Employee)
        .join(Department, Department.id == Employee.department_id)
        .join(Country, Country.id == Employee.country_id)
    )
    join = stmt.join if salaried_only or filters.needs_compensation else stmt.outerjoin
    stmt = join(comp, comp.c.employee_id == Employee.id)
    return apply_filters(stmt, filters, comp), comp


def aggregate(db: Session, filters: EmployeeFilters, metric: Metric, measure: Measure = Measure.BASE_SALARY) -> float | None:
    """A single number, or None when no employees match."""
    if metric == Metric.COUNT:
        stmt, _ = _base(lambda _c: [func.count(Employee.id)], filters, salaried_only=False)
        return float(db.scalar(stmt) or 0)
    if metric == Metric.MEDIAN:
        rows = _median(db, filters, measure, group_by=None)
        return rows[0][2] if rows else None
    stmt, _ = _base(lambda c: [_AGGREGATES[metric](measure_column(c, measure))], filters, salaried_only=True)
    value = db.scalar(stmt)
    return None if value is None else round(float(value), 2)


def grouped(
    db: Session, filters: EmployeeFilters, metric: Metric, group_by: GroupBy, measure: Measure = Measure.BASE_SALARY
) -> list[tuple[object, str, float]]:
    """(key, label, value) rows ordered by value descending."""
    if metric == Metric.MEDIAN:
        rows = _median(db, filters, measure, group_by)
    else:
        key, label = _group_columns(group_by)

        def columns(comp):
            value = func.count(Employee.id) if metric == Metric.COUNT else _AGGREGATES[metric](measure_column(comp, measure))
            return [key, label, value.label("value")]

        stmt, _ = _base(columns, filters, salaried_only=metric != Metric.COUNT)
        rows = [(k, str(lbl), round(float(v), 2)) for k, lbl, v in db.execute(stmt.group_by(key, label)) if v is not None]
    return sorted(rows, key=lambda r: r[2], reverse=True)


def _median(
    db: Session, filters: EmployeeFilters, measure: Measure, group_by: GroupBy | None, comp: Subquery | Table | None = None
) -> list[tuple[object, str, float]]:
    """Median via window functions (SQLite has no MEDIAN aggregate).

    Averages the middle one or two rows of each partition.
    """
    key, label = _group_columns(group_by) if group_by else (None, None)

    def columns(comp):
        value = measure_column(comp, measure)
        partition = [key] if group_by else None
        cols = [
            value.label("value"),
            func.row_number().over(partition_by=partition, order_by=value).label("rn"),
            func.count().over(partition_by=partition).label("cnt"),
        ]
        if group_by:
            cols = [key.label("gkey"), label.label("glabel"), *cols]
        return cols

    inner, _ = _base(columns, filters, salaried_only=True, comp=comp)
    ranked = inner.subquery()
    middle = ranked.c.rn.in_([(ranked.c.cnt + 1) // 2, (ranked.c.cnt + 2) // 2])
    if group_by:
        stmt = select(ranked.c.gkey, ranked.c.glabel, func.avg(ranked.c.value)).where(middle).group_by(ranked.c.gkey, ranked.c.glabel)
        return [(k, str(lbl), round(float(v), 2)) for k, lbl, v in db.execute(stmt)]
    value = db.scalar(select(func.avg(ranked.c.value)).where(middle))
    return [] if value is None else [(None, "All", round(float(value), 2))]


def top_earners(
    db: Session, filters: EmployeeFilters, limit: int, measure: Measure = Measure.BASE_SALARY, descending: bool = True
) -> list[dict]:
    def columns(comp):
        return [
            Employee.id,
            (Employee.first_name + " " + Employee.last_name).label("name"),
            Employee.job_title,
            Department.name.label("department"),
            Country.country_name.label("country"),
            measure_column(comp, measure).label("value"),
        ]

    stmt, comp = _base(columns, filters, salaried_only=True)
    value = measure_column(comp, measure)
    stmt = stmt.order_by(value.desc() if descending else value.asc(), Employee.id).limit(limit)
    return [{**row._asdict(), "value": round(float(row.value), 2)} for row in db.execute(stmt)]


def _breakdown(db: Session, filters: EmployeeFilters, group_by: GroupBy, comp: Table) -> list[GroupBreakdown]:
    key, label = _group_columns(group_by)

    def columns(comp):
        return [
            key,
            label,
            func.count(Employee.id),
            func.coalesce(func.avg(comp.c.annual_base_usd), 0),
            func.coalesce(func.sum(comp.c.total_comp_usd), 0),
        ]

    stmt, _ = _base(columns, filters, salaried_only=False, comp=comp)
    rows = db.execute(stmt.group_by(key, label))
    result = [
        GroupBreakdown(id=k, name=n, headcount=c, avg_salary_usd=round(a, 2), total_payroll_usd=round(t, 2))
        for k, n, c, a, t in rows
    ]
    return sorted(result, key=lambda g: g.total_payroll_usd, reverse=True)


def summary(db: Session, filters: EmployeeFilters) -> AnalyticsSummary:
    # Rank salaries once, only for employees matching the non-salary filters, and reuse it for every aggregate.
    candidates = apply_filters(select(Employee.id), replace(filters, min_salary_usd=None, max_salary_usd=None))
    comp = snapshot_current_compensation(db, candidates)
    try:
        stmt, _ = _base(
            lambda c: [
                func.count(Employee.id),
                func.coalesce(func.sum(c.c.total_comp_usd), 0),
                func.coalesce(func.avg(c.c.annual_base_usd), 0),
                func.coalesce(func.avg(c.c.bonus_usd), 0),
            ],
            filters,
            salaried_only=False,
            comp=comp,
        )
        headcount, total, avg, avg_bonus = db.execute(stmt).one()
        median = _median(db, filters, Measure.BASE_SALARY, group_by=None, comp=comp)
        return AnalyticsSummary(
            headcount=headcount,
            total_payroll_usd=round(total, 2),
            avg_salary_usd=round(avg, 2),
            median_salary_usd=median[0][2] if median else 0.0,
            avg_bonus_usd=round(avg_bonus, 2),
            by_department=_breakdown(db, filters, GroupBy.DEPARTMENT, comp),
            by_country=_breakdown(db, filters, GroupBy.COUNTRY, comp),
        )
    finally:
        drop_snapshot(db)

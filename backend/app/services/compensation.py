"""SQL building blocks for an employee's *current* compensation, normalised to annual USD.

The current salary is the record with the latest effective_date on or before today
(ties broken by id); future-dated records are scheduled changes and are ignored.
"""

from collections.abc import Sequence
from enum import StrEnum

from sqlalchemy import Column, ColumnElement, Float, Integer, MetaData, Select, Subquery, Table, case, func, insert, select, text
from sqlalchemy.orm import Session

from app.models import Country, Employee, PayFrequency, Salary


class Measure(StrEnum):
    BASE_SALARY = "base_salary"
    BONUS = "bonus"
    TOTAL_COMPENSATION = "total_compensation"


def current_compensation_subquery(employee_ids: Sequence[int] | Select | None = None) -> Subquery:
    """Current pay for every employee, or only `employee_ids` (much cheaper than ranking every salary row).

    `employee_ids` may be a list or a SELECT of employee ids.
    """
    ranked = select(
        Salary.employee_id,
        Salary.base_salary,
        Salary.bonus,
        Salary.pay_frequency,
        Salary.effective_date,
        func.row_number()
        .over(partition_by=Salary.employee_id, order_by=(Salary.effective_date.desc(), Salary.id.desc()))
        .label("rn"),
    ).where(Salary.effective_date <= func.current_date())
    if employee_ids is not None:
        ranked = ranked.where(Salary.employee_id.in_(employee_ids))
    ranked = ranked.subquery("ranked_salaries")

    periods = case(
        (ranked.c.pay_frequency == PayFrequency.MONTHLY, 12),
        (ranked.c.pay_frequency == PayFrequency.BIWEEKLY, 26),
        else_=1,
    )
    annual_base_local = ranked.c.base_salary * periods
    rate = Country.exchange_rate_to_usd

    return (
        select(
            ranked.c.employee_id,
            ranked.c.base_salary,
            ranked.c.bonus,
            ranked.c.pay_frequency,
            ranked.c.effective_date,
            Country.currency_code,
            # Rounded to cents so range filters are not skewed by float artefacts.
            func.round(annual_base_local * rate, 2).label("annual_base_usd"),
            func.round(ranked.c.bonus * rate, 2).label("bonus_usd"),
            func.round((annual_base_local + ranked.c.bonus) * rate, 2).label("total_comp_usd"),
        )
        .join(Employee, Employee.id == ranked.c.employee_id)
        .join(Country, Country.id == Employee.country_id)
        .where(ranked.c.rn == 1)
        .subquery("current_comp")
    )


def measure_column(comp: Subquery, measure: Measure) -> ColumnElement[float]:
    return {
        Measure.BASE_SALARY: comp.c.annual_base_usd,
        Measure.BONUS: comp.c.bonus_usd,
        Measure.TOTAL_COMPENSATION: comp.c.total_comp_usd,
    }[measure]


# Per-connection temporary table, so several aggregates can share one ranking pass.
_snapshot = Table(
    "current_comp_snapshot",
    MetaData(),
    Column("employee_id", Integer, primary_key=True),
    Column("annual_base_usd", Float),
    Column("bonus_usd", Float),
    Column("total_comp_usd", Float),
    prefixes=["TEMPORARY"],
)


def snapshot_current_compensation(db: Session, employee_ids: Select | None = None) -> Table:
    """Materialise current pay (for `employee_ids`, or everyone) into a temporary table and return it.

    The table has the USD columns of `current_compensation_subquery`; drop it with `drop_snapshot`.
    """
    connection = db.connection()
    drop_snapshot(db)
    _snapshot.create(connection)
    comp = current_compensation_subquery(employee_ids)
    columns = ["employee_id", "annual_base_usd", "bonus_usd", "total_comp_usd"]
    connection.execute(insert(_snapshot).from_select(columns, select(*(comp.c[name] for name in columns))))
    return _snapshot


def drop_snapshot(db: Session) -> None:
    db.connection().execute(text(f"DROP TABLE IF EXISTS {_snapshot.name}"))

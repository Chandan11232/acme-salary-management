"""SQL building blocks for an employee's *current* compensation, normalised to annual USD.

The current salary is the record with the latest effective_date on or before today
(ties broken by id); future-dated records are scheduled changes and are ignored.
"""

from enum import StrEnum

from sqlalchemy import ColumnElement, Subquery, case, func, select

from app.models import Country, Employee, PayFrequency, Salary


class Measure(StrEnum):
    BASE_SALARY = "base_salary"
    BONUS = "bonus"
    TOTAL_COMPENSATION = "total_compensation"


def current_compensation_subquery() -> Subquery:
    ranked = select(
        Salary.employee_id,
        Salary.base_salary,
        Salary.bonus,
        Salary.pay_frequency,
        Salary.effective_date,
        func.row_number()
        .over(partition_by=Salary.employee_id, order_by=(Salary.effective_date.desc(), Salary.id.desc()))
        .label("rn"),
    ).where(Salary.effective_date <= func.current_date()).subquery("ranked_salaries")

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
            (annual_base_local * rate).label("annual_base_usd"),
            (ranked.c.bonus * rate).label("bonus_usd"),
            ((annual_base_local + ranked.c.bonus) * rate).label("total_comp_usd"),
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

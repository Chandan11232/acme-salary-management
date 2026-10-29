"""Seed the database with reference data and exactly 10,000 employees.

Usage (from backend/):  python -m scripts.seed [--employees N] [--reset]

Deterministic: Faker and `random` are seeded, so every run produces the same data.
Uses bulk inserts so the full seed completes in a few seconds.
"""

import argparse
import random
import time
from datetime import date, timedelta

from faker import Faker
from sqlalchemy import func, insert, select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import Country, Department, Employee, EmploymentType, PayFrequency, Salary

SEED = 42
DEFAULT_EMPLOYEES = 10_000
BATCH_SIZE = 2_000

# (name, code, annual base salary range in USD, job titles)
DEPARTMENTS: list[tuple[str, str, tuple[int, int], list[str]]] = [
    ("Engineering", "ENG", (85_000, 210_000), ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager", "QA Engineer", "DevOps Engineer"]),
    ("Sales", "SAL", (50_000, 150_000), ["Account Executive", "Sales Development Rep", "Sales Manager", "Regional Sales Director"]),
    ("Marketing", "MKT", (55_000, 140_000), ["Marketing Specialist", "Content Strategist", "Growth Manager", "Brand Manager"]),
    ("Human Resources", "HR", (50_000, 125_000), ["HR Generalist", "Recruiter", "HR Business Partner", "People Operations Manager"]),
    ("Finance", "FIN", (60_000, 170_000), ["Financial Analyst", "Accountant", "Controller", "FP&A Manager"]),
    ("Operations", "OPS", (45_000, 120_000), ["Operations Analyst", "Logistics Coordinator", "Operations Manager"]),
    ("Customer Support", "SUP", (38_000, 90_000), ["Support Specialist", "Support Engineer", "Support Team Lead"]),
    ("Product", "PRD", (80_000, 190_000), ["Product Manager", "Senior Product Manager", "Product Designer", "UX Researcher"]),
]

# (name, currency, USD per unit of local currency, cost-of-labour multiplier vs US, Faker locale, weight)
COUNTRIES: list[tuple[str, str, float, float, str, int]] = [
    ("United States", "USD", 1.0, 1.00, "en_US", 35),
    ("United Kingdom", "GBP", 1.27, 0.80, "en_GB", 15),
    ("Germany", "EUR", 1.08, 0.82, "de_DE", 15),
    ("India", "INR", 0.012, 0.28, "en_IN", 20),
    ("Canada", "CAD", 0.73, 0.85, "en_CA", 10),
    ("Japan", "JPY", 0.0067, 0.72, "ja_JP", 5),
]

EMPLOYMENT_WEIGHTS = {EmploymentType.FULL_TIME: 80, EmploymentType.CONTRACT: 12, EmploymentType.PART_TIME: 8}
TODAY = date(2026, 1, 1)


def _seed_reference(db: Session) -> tuple[list[int], list[tuple[int, float, float, str, int]]]:
    db.execute(insert(Department), [{"name": n, "code": c} for n, c, _, _ in DEPARTMENTS])
    db.execute(
        insert(Country),
        [{"country_name": n, "currency_code": cur, "exchange_rate_to_usd": rate} for n, cur, rate, *_ in COUNTRIES],
    )
    dept_ids = list(db.scalars(select(Department.id).order_by(Department.id)))
    country_ids = list(db.scalars(select(Country.id).order_by(Country.id)))
    countries = [(cid, rate, mult, locale, weight) for cid, (_, _, rate, mult, locale, weight) in zip(country_ids, COUNTRIES)]
    return dept_ids, countries


def _salary_history(rng: random.Random, employee_id: int, hire_date: date, annual_local: float, emp_type: EmploymentType) -> list[dict]:
    """1-3 salary records: starting salary at hire, then raises over time."""
    frequency = PayFrequency.MONTHLY if emp_type == EmploymentType.CONTRACT else PayFrequency.ANNUAL
    periods = 12 if frequency == PayFrequency.MONTHLY else 1
    years_employed = max((TODAY - hire_date).days // 365, 0)
    n_records = min(1 + years_employed // 2, 3)

    records = []
    current = annual_local / (1.05 ** (n_records - 1))
    for i in range(n_records):
        effective = hire_date + timedelta(days=int(i * 365 * max(years_employed, 1) / n_records))
        bonus_pct = 0 if emp_type == EmploymentType.CONTRACT else rng.uniform(0.0, 0.15)
        records.append(
            {
                "employee_id": employee_id,
                "base_salary": round(current / periods, 2),
                "bonus": round(current * bonus_pct, 2),
                "effective_date": effective,
                "pay_frequency": frequency,
            }
        )
        current *= rng.uniform(1.03, 1.08)
    return records


def seed(db: Session, n_employees: int = DEFAULT_EMPLOYEES) -> None:
    rng = random.Random(SEED)
    Faker.seed(SEED)
    fakers = {locale: Faker(locale) for *_, locale, _ in COUNTRIES}

    dept_ids, countries = _seed_reference(db)
    country_weights = [c[4] for c in countries]
    emp_types = list(EMPLOYMENT_WEIGHTS)
    emp_weights = list(EMPLOYMENT_WEIGHTS.values())

    employees: list[dict] = []
    comp: list[tuple[date, float, EmploymentType]] = []
    for i in range(n_employees):
        dept_idx = rng.randrange(len(DEPARTMENTS))
        _, _, (lo, hi), titles = DEPARTMENTS[dept_idx]
        country_id, rate, mult, locale, _ = rng.choices(countries, weights=country_weights)[0]
        emp_type = rng.choices(emp_types, weights=emp_weights)[0]
        fake = fakers[locale]
        first, last = _names(fake, locale)
        hire_date = TODAY - timedelta(days=rng.randint(30, 365 * 12))

        annual_usd = rng.uniform(lo, hi) * mult * (0.5 if emp_type == EmploymentType.PART_TIME else 1.0)
        employees.append(
            {
                "first_name": first,
                "last_name": last,
                # The index suffix guarantees uniqueness; ASCII-only local part.
                "email": f"{_ascii(first)}.{_ascii(last)}.{i + 1}@acme.example",
                "department_id": dept_ids[dept_idx],
                "country_id": country_id,
                "job_title": rng.choice(titles),
                "hire_date": hire_date,
                "employment_type": emp_type,
            }
        )
        comp.append((hire_date, annual_usd / rate, emp_type))

    for start in range(0, n_employees, BATCH_SIZE):
        db.execute(insert(Employee), employees[start : start + BATCH_SIZE])

    employee_ids = list(db.scalars(select(Employee.id).order_by(Employee.id)))
    salaries = [
        record
        for emp_id, (hire_date, annual_local, emp_type) in zip(employee_ids, comp)
        for record in _salary_history(rng, emp_id, hire_date, annual_local, emp_type)
    ]
    for start in range(0, len(salaries), BATCH_SIZE * 2):
        db.execute(insert(Salary), salaries[start : start + BATCH_SIZE * 2])
    db.commit()


def _names(fake: Faker, locale: str) -> tuple[str, str]:
    if locale == "ja_JP":
        return fake.first_romanized_name(), fake.last_romanized_name()
    return fake.first_name(), fake.last_name()


def _ascii(value: str) -> str:
    cleaned = "".join(ch for ch in value.lower() if ch.isascii() and ch.isalnum())
    return cleaned or "employee"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--employees", type=int, default=DEFAULT_EMPLOYEES)
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables first")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        if db.scalar(select(func.count(Employee.id))):
            print("Database already seeded; pass --reset to reseed.")
            return
        started = time.perf_counter()
        seed(db, args.employees)
        print(
            f"Seeded {db.scalar(select(func.count(Employee.id)))} employees and "
            f"{db.scalar(select(func.count(Salary.id)))} salary records in {time.perf_counter() - started:.1f}s"
        )


if __name__ == "__main__":
    main()

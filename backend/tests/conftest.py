"""Fixtures: a fresh in-memory SQLite database per test with a small, hand-checkable dataset.

USD figures for the fixture data (current annual base / total compensation):
  Alice  ENG US FT  120,000 / 130,000  (earlier 100,000 record superseded)
  Bob    ENG DE FT  110,000 / 115,500  (100,000 EUR @ 1.1)
  Carol  SAL US CT   60,000 /  60,000  (5,000/month)
  Dan    SAL IN FT   30,000 /  30,000  (2,500,000 INR @ 0.012)
  Eve    ENG US PT   no salary record
  Frank  ENG US FT   90,000 /  90,000  (future-dated 200,000 raise ignored)
"""

from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, build_engine, get_db
from app.main import create_app
from app.models import Country, Department, Employee, EmploymentType, PayFrequency, Salary


@pytest.fixture
def db() -> Iterator[Session]:
    engine = build_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    _seed(session)
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client


def _seed(db: Session) -> None:
    eng = Department(id=1, name="Engineering", code="ENG")
    sales = Department(id=2, name="Sales", code="SAL")
    us = Country(id=1, country_name="United States", currency_code="USD", exchange_rate_to_usd=1.0)
    de = Country(id=2, country_name="Germany", currency_code="EUR", exchange_rate_to_usd=1.1)
    india = Country(id=3, country_name="India", currency_code="INR", exchange_rate_to_usd=0.012)
    db.add_all([eng, sales, us, de, india])

    def employee(id_: int, first: str, last: str, dept: Department, country: Country, emp_type: EmploymentType, title: str) -> Employee:
        return Employee(
            id=id_,
            first_name=first,
            last_name=last,
            email=f"{first.lower()}@acme.example",
            department=dept,
            country=country,
            job_title=title,
            hire_date=date(2019, 6, 1),
            employment_type=emp_type,
        )

    def salary(base: float, effective: date, bonus: float = 0, freq: PayFrequency = PayFrequency.ANNUAL) -> Salary:
        return Salary(base_salary=base, bonus=bonus, effective_date=effective, pay_frequency=freq)

    alice = employee(1, "Alice", "Smith", eng, us, EmploymentType.FULL_TIME, "Staff Engineer")
    alice.salaries = [salary(100_000, date(2020, 1, 1)), salary(120_000, date(2023, 1, 1), bonus=10_000)]
    bob = employee(2, "Bob", "Jones", eng, de, EmploymentType.FULL_TIME, "Software Engineer")
    bob.salaries = [salary(100_000, date(2022, 1, 1), bonus=5_000)]
    carol = employee(3, "Carol", "White", sales, us, EmploymentType.CONTRACT, "Account Executive")
    carol.salaries = [salary(5_000, date(2022, 3, 1), freq=PayFrequency.MONTHLY)]
    dan = employee(4, "Dan", "Brown", sales, india, EmploymentType.FULL_TIME, "Sales Manager")
    dan.salaries = [salary(2_500_000, date(2021, 1, 1))]
    eve = employee(5, "Eve", "Black", eng, us, EmploymentType.PART_TIME, "QA Engineer")
    frank = employee(6, "Frank", "Green", eng, us, EmploymentType.FULL_TIME, "DevOps Engineer")
    frank.salaries = [salary(90_000, date(2021, 1, 1)), salary(200_000, date(2999, 1, 1))]

    db.add_all([alice, bob, carol, dan, eve, frank])
    db.commit()

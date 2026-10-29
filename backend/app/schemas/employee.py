from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.models.enums import EmploymentType, PayFrequency
from app.schemas.common import ORMModel
from app.schemas.reference import CountryOut, DepartmentOut
from app.schemas.salary import SalaryCreate, SalaryOut

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class EmployeeBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=255, pattern=EMAIL_PATTERN)
    department_id: int
    country_id: int
    job_title: str = Field(min_length=1, max_length=150)
    hire_date: date
    employment_type: EmploymentType = EmploymentType.FULL_TIME

    @field_validator("first_name", "last_name", "job_title", "email")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        return value.lower()


class EmployeeCreate(EmployeeBase):
    salary: SalaryCreate | None = Field(default=None, description="Optional initial salary record")


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=255, pattern=EMAIL_PATTERN)
    department_id: int | None = None
    country_id: int | None = None
    job_title: str | None = Field(default=None, min_length=1, max_length=150)
    hire_date: date | None = None
    employment_type: EmploymentType | None = None

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class CurrentCompensation(BaseModel):
    base_salary: float
    bonus: float
    pay_frequency: PayFrequency
    effective_date: date
    currency_code: str
    annual_base_usd: float
    total_comp_usd: float


class EmployeeListItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    job_title: str
    hire_date: date
    employment_type: EmploymentType
    department: DepartmentOut
    country: CountryOut
    current_compensation: CurrentCompensation | None


class EmployeeDetail(EmployeeListItem):
    salaries: list[SalaryOut]


class EmployeeSortField(StrEnum):
    LAST_NAME = "last_name"
    FIRST_NAME = "first_name"
    HIRE_DATE = "hire_date"
    JOB_TITLE = "job_title"
    DEPARTMENT = "department"
    COUNTRY = "country"
    SALARY = "salary"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"

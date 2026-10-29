from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import PayFrequency
from app.schemas.common import ORMModel


class SalaryBase(BaseModel):
    base_salary: float = Field(gt=0, le=1_000_000_000, description="Amount per pay period, local currency")
    bonus: float = Field(default=0, ge=0, le=1_000_000_000, description="Annual bonus, local currency")
    effective_date: date
    pay_frequency: PayFrequency = PayFrequency.ANNUAL


class SalaryCreate(SalaryBase):
    pass


class SalaryUpdate(BaseModel):
    base_salary: float | None = Field(default=None, gt=0, le=1_000_000_000)
    bonus: float | None = Field(default=None, ge=0, le=1_000_000_000)
    effective_date: date | None = None
    pay_frequency: PayFrequency | None = None


class SalaryOut(ORMModel, SalaryBase):
    id: int
    employee_id: int

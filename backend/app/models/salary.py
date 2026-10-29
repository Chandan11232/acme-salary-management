from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, Float, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PayFrequency

if TYPE_CHECKING:
    from app.models.employee import Employee


class Salary(Base):
    """One compensation record. Amounts are in the employee's local currency;
    `base_salary` is per pay period and `bonus` is annual."""

    __tablename__ = "salaries"
    __table_args__ = (Index("ix_salaries_employee_effective", "employee_id", "effective_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    base_salary: Mapped[float] = mapped_column(Float)
    bonus: Mapped[float] = mapped_column(Float, default=0.0)
    effective_date: Mapped[date] = mapped_column(Date)
    pay_frequency: Mapped[PayFrequency] = mapped_column(
        Enum(PayFrequency, native_enum=False, length=20)
    )

    employee: Mapped["Employee"] = relationship(back_populates="salaries")

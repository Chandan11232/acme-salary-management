from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import EmploymentType

if TYPE_CHECKING:
    from app.models.country import Country
    from app.models.department import Department
    from app.models.salary import Salary


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (Index("ix_employees_name", "last_name", "first_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"), index=True)
    job_title: Mapped[str] = mapped_column(String(150))
    hire_date: Mapped[date] = mapped_column(Date)
    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(EmploymentType, native_enum=False, length=20), index=True
    )

    department: Mapped["Department"] = relationship(lazy="joined")
    country: Mapped["Country"] = relationship(lazy="joined")
    salaries: Mapped[list["Salary"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(Salary.effective_date), desc(Salary.id)",
    )

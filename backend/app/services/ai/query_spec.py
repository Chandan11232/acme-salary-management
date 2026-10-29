"""The structured query an HR question is translated into.

Both parsers (rule-based and LLM) produce a QuerySpec; only the executor touches the
database, and it only runs whitelisted aggregations. No generated SQL is ever executed.
"""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import EmploymentType
from app.services.analytics_service import GroupBy, Metric
from app.services.compensation import Measure


class Intent(StrEnum):
    AGGREGATE = "aggregate"  # one number, e.g. "average salary in Sales"
    GROUP = "group"  # one number per group, e.g. "average salary by country"
    RANK = "rank"  # list of employees, e.g. "top 5 earners in Engineering"
    UNSUPPORTED = "unsupported"


class QuerySpec(BaseModel):
    intent: Intent
    metric: Metric = Field(default=Metric.AVG, description="Ignored for rank")
    measure: Measure = Measure.BASE_SALARY
    departments: list[str] = Field(default_factory=list, description="Department names exactly as listed")
    countries: list[str] = Field(default_factory=list, description="Country names exactly as listed")
    employment_types: list[EmploymentType] = Field(default_factory=list)
    job_title_contains: str | None = None
    group_by: GroupBy | None = Field(default=None, description="Required when intent is group")
    limit: int = Field(default=5, ge=1, le=50, description="Rank only")
    order: Literal["desc", "asc"] = Field(default="desc", description="Rank only: desc = highest paid first")


class ResultTable(BaseModel):
    columns: list[str]
    rows: list[list[str | float | int]]


class AIAnswer(BaseModel):
    question: str
    answer: str
    interpretation: str | None = None
    parser: Literal["llm", "rules"]
    spec: QuerySpec | None = None
    value: float | None = None
    unit: Literal["usd", "count"] | None = None
    table: ResultTable | None = None


class AIQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=500)

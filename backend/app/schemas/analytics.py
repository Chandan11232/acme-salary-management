from pydantic import BaseModel


class GroupBreakdown(BaseModel):
    id: int
    name: str
    headcount: int
    avg_salary_usd: float
    total_payroll_usd: float


class AnalyticsSummary(BaseModel):
    headcount: int
    total_payroll_usd: float
    avg_salary_usd: float
    median_salary_usd: float
    avg_bonus_usd: float
    by_department: list[GroupBreakdown]
    by_country: list[GroupBreakdown]

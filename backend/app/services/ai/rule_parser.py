"""Deterministic keyword parser: the offline default and the fallback when the LLM fails."""

import re

from app.models.enums import EmploymentType
from app.services.ai.query_spec import Intent, QuerySpec
from app.services.ai.vocabulary import Vocabulary, find_mentions
from app.services.analytics_service import GroupBy, Metric
from app.services.compensation import Measure

_EMPLOYMENT_PATTERNS = {
    EmploymentType.CONTRACT: r"\bcontract(or|ors|ed)?\b",
    EmploymentType.PART_TIME: r"\bpart[\s-]?tim(e|ers?)\b",
    EmploymentType.FULL_TIME: r"\bfull[\s-]?tim(e|ers?)\b",
}
_GROUP_PATTERNS = {
    GroupBy.DEPARTMENT: r"\b(by|per|each|every|across|all)\s+(department|dept|team)s?\b|\bwhich\s+(department|team)s?\b|\bdepartments\b",
    GroupBy.COUNTRY: r"\b(by|per|each|every|across|all)\s+(country|countries|location|region)s?\b|\bwhich\s+(country|location)\b|\bcountries\b",
    GroupBy.EMPLOYMENT_TYPE: r"\b(by|per|each)\s+(employment|contract|worker)\s+types?\b",
}
_METRIC_PATTERNS: list[tuple[Metric, str]] = [
    (Metric.MEDIAN, r"\bmedian\b"),
    (Metric.COUNT, r"\bhow many\b|\bcount\b|\bnumber of\b|\bheadcount\b|\bhead count\b"),
    (Metric.AVG, r"\baverage\b|\bavg\b|\bmean\b|\btypical\b"),
    (Metric.SUM, r"\btotal\b|\bsum\b|\bpayroll\b|\bspend\b|\bcost\b"),
    (Metric.MAX, r"\bhighest\b|\bmaximum\b|\bmax\b|\blargest\b|\bmost\b"),
    (Metric.MIN, r"\blowest\b|\bminimum\b|\bmin\b|\bsmallest\b|\bleast\b"),
]
_RANK_PATTERN = re.compile(
    r"\b(top|bottom)\s+(\d+)\b|\b(highest|best|top|lowest|least|worst)[\s-](paid|earners?|earning)\b|\bwho\s+(earns|makes|is paid)\b"
)
_ROLE_PATTERN = re.compile(r"\b(engineer|manager|analyst|designer|recruiter|accountant|director|specialist)s?\b")
_LOW_WORDS = re.compile(r"\b(bottom|lowest|least|worst)\b")
_SALARY_WORDS = re.compile(r"\b(salary|salaries|pay|paid|earn\w*|compensation|comp|wage|wages|bonus\w*|payroll)\b")


def parse(question: str, vocab: Vocabulary) -> QuerySpec:
    original = question.strip()
    text = original.lower()

    departments = [e.name for e in find_mentions(text, vocab.departments)]
    countries = [e.name for e in find_mentions(text, vocab.countries)]
    if re.search(r"\bUS\b", original) and (us := vocab.resolve("countries", "united states")) and us.name not in countries:
        countries.append(us.name)
    employment_types = [t for t, pattern in _EMPLOYMENT_PATTERNS.items() if re.search(pattern, text)]

    measure = Measure.BASE_SALARY
    if re.search(r"\bbonus", text):
        measure = Measure.BONUS
    elif re.search(r"\btotal comp(ensation)?\b|\bpayroll\b|\bcost\b|\bspend\b", text):
        measure = Measure.TOTAL_COMPENSATION

    role = _ROLE_PATTERN.search(text)
    filters = {
        "departments": departments,
        "countries": countries,
        "employment_types": employment_types,
        "job_title_contains": role.group(1) if role else None,
        "measure": measure,
    }

    rank = _RANK_PATTERN.search(text)
    if rank:
        limit = int(rank.group(2)) if rank.group(2) else (1 if rank.group(5) else 5)
        order = "asc" if _LOW_WORDS.search(text) else "desc"
        return QuerySpec(intent=Intent.RANK, limit=min(max(limit, 1), 50), order=order, **filters)

    metric = next((m for m, pattern in _METRIC_PATTERNS if re.search(pattern, text)), None)
    if re.search(r"\b(most|fewest|least|more|fewer)\s+(employees|people|staff|headcount)\b", text):
        metric = Metric.COUNT
    group_by = next((g for g, pattern in _GROUP_PATTERNS.items() if re.search(pattern, text)), None)
    # "Average salary by department in Germany" mentions departments generically, not by name.
    if group_by == GroupBy.DEPARTMENT and len(departments) > 1:
        group_by = None
    if group_by == GroupBy.COUNTRY and len(countries) > 1:
        group_by = None

    if metric is None:
        if _SALARY_WORDS.search(text):
            metric = Metric.AVG
        elif group_by or re.search(r"\bemployees?\b|\bpeople\b|\bstaff\b", text):
            metric = Metric.COUNT
        else:
            return QuerySpec(intent=Intent.UNSUPPORTED)

    if group_by:
        return QuerySpec(intent=Intent.GROUP, metric=metric, group_by=group_by, **filters)
    return QuerySpec(intent=Intent.AGGREGATE, metric=metric, **filters)

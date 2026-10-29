"""Runs a validated QuerySpec through the whitelisted analytics functions."""

from sqlalchemy.orm import Session

from app.models.enums import EmploymentType
from app.services import analytics_service as analytics
from app.services.ai.query_spec import AIAnswer, Intent, QuerySpec, ResultTable
from app.services.ai.vocabulary import Vocabulary
from app.services.analytics_service import GroupBy, Metric
from app.services.compensation import Measure
from app.services.filters import EmployeeFilters

EXAMPLES = [
    "What is the average salary in Engineering in Germany?",
    "Total payroll by country",
    "Top 5 earners in Sales",
    "How many contractors do we have in India?",
    "Which department has the highest median salary?",
]
_METRIC_LABELS = {
    Metric.AVG: "Average",
    Metric.SUM: "Total",
    Metric.MIN: "Lowest",
    Metric.MAX: "Highest",
    Metric.MEDIAN: "Median",
    Metric.COUNT: "Headcount",
}
_MEASURE_LABELS = {
    Measure.BASE_SALARY: "base salary",
    Measure.BONUS: "bonus",
    Measure.TOTAL_COMPENSATION: "total compensation",
}
_GROUP_LABELS = {GroupBy.DEPARTMENT: "Department", GroupBy.COUNTRY: "Country", GroupBy.EMPLOYMENT_TYPE: "Employment type"}


class UnknownEntityError(ValueError):
    pass


def unsupported_answer(question: str, parser: str, reason: str | None = None) -> AIAnswer:
    hint = "Try one of: " + "; ".join(f'"{e}"' for e in EXAMPLES)
    return AIAnswer(
        question=question,
        parser=parser,
        answer=f"{reason or 'I can only answer questions about headcount and compensation.'} {hint}",
    )


def _to_filters(spec: QuerySpec, vocab: Vocabulary) -> EmployeeFilters:
    def ids(kind: str, names: list[str]) -> list[int]:
        resolved = []
        for name in names:
            entity = vocab.resolve(kind, name)
            if entity is None:
                raise UnknownEntityError(f"I don't know a {kind[:-1].replace('ie', 'y')} called \"{name}\".")
            resolved.append(entity.id)
        return resolved

    return EmployeeFilters(
        department_ids=ids("departments", spec.departments),
        country_ids=ids("countries", spec.countries),
        employment_types=spec.employment_types,
        job_title_contains=spec.job_title_contains,
    )


_EMPLOYMENT_LABELS = {EmploymentType.FULL_TIME: "full-time", EmploymentType.PART_TIME: "part-time", EmploymentType.CONTRACT: "contractors"}


def _scope(spec: QuerySpec) -> str:
    parts = [*spec.departments, *spec.countries, *(_EMPLOYMENT_LABELS[t] for t in spec.employment_types)]
    if spec.job_title_contains:
        parts.append(f'job title contains "{spec.job_title_contains}"')
    return ", ".join(parts) if parts else "all employees"


def _fmt(value: float, metric: Metric) -> str:
    return f"{int(value):,}" if metric == Metric.COUNT else f"${value:,.0f}"


def _subject(spec: QuerySpec) -> str:
    if spec.metric == Metric.COUNT:
        return "Headcount"
    if spec.metric == Metric.SUM and spec.measure == Measure.TOTAL_COMPENSATION:
        return "Total payroll"
    return f"{_METRIC_LABELS[spec.metric]} {_MEASURE_LABELS[spec.measure]}"


def execute(db: Session, spec: QuerySpec, vocab: Vocabulary, question: str, parser: str) -> AIAnswer:
    if spec.intent == Intent.UNSUPPORTED:
        return unsupported_answer(question, parser, "I couldn't map that question to the compensation data.")
    try:
        filters = _to_filters(spec, vocab)
    except UnknownEntityError as exc:
        return unsupported_answer(question, parser, str(exc))

    scope = _scope(spec)
    unit = "count" if spec.metric == Metric.COUNT else "usd"
    common = {"question": question, "parser": parser, "spec": spec}

    if spec.intent == Intent.RANK:
        rows = analytics.top_earners(db, filters, spec.limit, spec.measure, descending=spec.order == "desc")
        direction = "Highest" if spec.order == "desc" else "Lowest"
        interpretation = f"{direction} {spec.limit} by {_MEASURE_LABELS[spec.measure]} · {scope}"
        if not rows:
            return AIAnswer(**common, interpretation=interpretation, answer=f"No salaried employees match {scope}.")
        top = rows[0]
        return AIAnswer(
            **common,
            interpretation=interpretation,
            unit="usd",
            answer=f"{direction} paid in {scope}: {top['name']} ({top['job_title']}, {top['country']}) at ${top['value']:,.0f}.",
            table=ResultTable(
                columns=["Name", "Job title", "Department", "Country", f"Annual {_MEASURE_LABELS[spec.measure]} (USD)"],
                rows=[[r["name"], r["job_title"], r["department"], r["country"], r["value"]] for r in rows],
            ),
        )

    if spec.intent == Intent.GROUP and spec.group_by is not None:
        rows = analytics.grouped(db, filters, spec.metric, spec.group_by, spec.measure)
        group_label = _GROUP_LABELS[spec.group_by]
        interpretation = f"{_subject(spec)} by {group_label.lower()} · {scope}"
        if not rows:
            return AIAnswer(**common, interpretation=interpretation, answer=f"No data matches {scope}.")
        (_, top_name, top_value), (_, low_name, low_value) = rows[0], rows[-1]
        answer = f"{_subject(spec)} by {group_label.lower()} for {scope}: {top_name} is highest at {_fmt(top_value, spec.metric)}"
        answer += f", {low_name} is lowest at {_fmt(low_value, spec.metric)}." if len(rows) > 1 else "."
        return AIAnswer(
            **common,
            interpretation=interpretation,
            unit=unit,
            answer=answer,
            table=ResultTable(
                columns=[group_label, "Headcount" if spec.metric == Metric.COUNT else f"{_subject(spec)} (USD)"],
                rows=[[str(label), value] for _, label, value in rows],
            ),
        )

    value = analytics.aggregate(db, filters, spec.metric, spec.measure)
    interpretation = f"{_subject(spec)} · {scope}"
    if value is None:
        return AIAnswer(**common, interpretation=interpretation, answer=f"No salaried employees match {scope}.")
    suffix = "" if spec.metric == Metric.COUNT else " (annual, USD)"
    return AIAnswer(
        **common,
        interpretation=interpretation,
        unit=unit,
        value=value,
        answer=f"{_subject(spec)} for {scope}: {_fmt(value, spec.metric)}{suffix}.",
    )

import pytest

from app.services import analytics_service as analytics
from app.services.analytics_service import GroupBy, Metric
from app.services.compensation import Measure
from app.services.filters import EmployeeFilters

ALL = EmployeeFilters()
ENG = EmployeeFilters(department_ids=[1])
SALES = EmployeeFilters(department_ids=[2])


class TestSummaryEndpoint:
    def test_totals(self, client):
        body = client.get("/api/analytics/summary").json()
        assert body["headcount"] == 6
        assert body["total_payroll_usd"] == pytest.approx(425_500)
        assert body["avg_salary_usd"] == pytest.approx(82_000)
        assert body["median_salary_usd"] == pytest.approx(90_000)

    def test_breakdowns_sorted_by_payroll(self, client):
        body = client.get("/api/analytics/summary").json()
        departments = {d["name"]: d for d in body["by_department"]}
        assert [d["name"] for d in body["by_department"]] == ["Engineering", "Sales"]
        assert departments["Engineering"]["headcount"] == 4  # includes unsalaried Eve
        assert departments["Engineering"]["avg_salary_usd"] == pytest.approx(106_666.67)
        assert [c["name"] for c in body["by_country"]] == ["United States", "Germany", "India"]

    def test_filtered(self, client):
        body = client.get("/api/analytics/summary", params={"country_id": 3}).json()
        assert body["headcount"] == 1 and body["avg_salary_usd"] == pytest.approx(30_000)

    def test_empty_result(self, client):
        body = client.get("/api/analytics/summary", params={"department_id": 999}).json()
        assert body["headcount"] == 0 and body["total_payroll_usd"] == 0 and body["median_salary_usd"] == 0


class TestAggregates:
    @pytest.mark.parametrize(
        "metric,filters,expected",
        [
            (Metric.AVG, ENG, 106_666.67),
            (Metric.SUM, ALL, 410_000),
            (Metric.MIN, ALL, 30_000),
            (Metric.MAX, ENG, 120_000),
            (Metric.COUNT, ENG, 4),
            (Metric.MEDIAN, ENG, 110_000),  # odd count
            (Metric.MEDIAN, SALES, 45_000),  # even count -> mean of middle two
        ],
    )
    def test_metric(self, db, metric, filters, expected):
        assert analytics.aggregate(db, filters, metric) == pytest.approx(expected)

    def test_total_compensation_measure(self, db):
        assert analytics.aggregate(db, ALL, Metric.SUM, Measure.TOTAL_COMPENSATION) == pytest.approx(425_500)

    def test_bonus_measure_converted_to_usd(self, db):
        assert analytics.aggregate(db, EmployeeFilters(country_ids=[2]), Metric.SUM, Measure.BONUS) == pytest.approx(5_500)

    def test_no_matches_returns_none(self, db):
        assert analytics.aggregate(db, EmployeeFilters(department_ids=[999]), Metric.AVG) is None
        assert analytics.aggregate(db, EmployeeFilters(department_ids=[999]), Metric.MEDIAN) is None


class TestGrouped:
    def test_avg_by_department(self, db):
        rows = analytics.grouped(db, ALL, Metric.AVG, GroupBy.DEPARTMENT)
        assert [(r[1], r[2]) for r in rows] == [("Engineering", pytest.approx(106_666.67)), ("Sales", 45_000)]

    def test_median_by_department(self, db):
        rows = analytics.grouped(db, ALL, Metric.MEDIAN, GroupBy.DEPARTMENT)
        assert [(r[1], r[2]) for r in rows] == [("Engineering", 110_000), ("Sales", 45_000)]

    def test_headcount_by_employment_type(self, db):
        rows = {r[1]: r[2] for r in analytics.grouped(db, ALL, Metric.COUNT, GroupBy.EMPLOYMENT_TYPE)}
        assert rows == {"FULL_TIME": 4, "CONTRACT": 1, "PART_TIME": 1}


def test_top_and_bottom_earners(db):
    assert [r["name"] for r in analytics.top_earners(db, ALL, 2)] == ["Alice Smith", "Bob Jones"]
    assert [r["name"] for r in analytics.top_earners(db, ALL, 2, descending=False)] == ["Dan Brown", "Carol White"]

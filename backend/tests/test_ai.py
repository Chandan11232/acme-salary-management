import pytest

from app.models.enums import EmploymentType
from app.routers.ai import get_llm_parser
from app.services.ai import rule_parser
from app.services.ai.query_spec import Intent, QuerySpec
from app.services.ai.service import answer_question
from app.services.ai.vocabulary import Vocabulary
from app.services.analytics_service import GroupBy, Metric
from app.services.compensation import Measure


@pytest.fixture
def vocab(db) -> Vocabulary:
    return Vocabulary.load(db)


class TestRuleParser:
    def test_aggregate_with_department_and_country(self, vocab):
        spec = rule_parser.parse("What is the average salary in the Engineering department in Germany?", vocab)
        assert spec.intent == Intent.AGGREGATE and spec.metric == Metric.AVG
        assert spec.departments == ["Engineering"] and spec.countries == ["Germany"]

    @pytest.mark.parametrize(
        "question,metric",
        [
            ("median pay in sales", Metric.MEDIAN),
            ("how many employees in India", Metric.COUNT),
            ("total salary spend", Metric.SUM),
            ("highest salary in engineering", Metric.MAX),
            ("minimum salary in Germany", Metric.MIN),
            ("what do engineers earn", Metric.AVG),
        ],
    )
    def test_metric_keywords(self, vocab, question, metric):
        assert rule_parser.parse(question, vocab).metric == metric

    @pytest.mark.parametrize(
        "question,measure",
        [("average bonus", Measure.BONUS), ("total payroll", Measure.TOTAL_COMPENSATION), ("average salary", Measure.BASE_SALARY)],
    )
    def test_measure_keywords(self, vocab, question, measure):
        assert rule_parser.parse(question, vocab).measure == measure

    @pytest.mark.parametrize(
        "question,group_by",
        [
            ("average salary by department", GroupBy.DEPARTMENT),
            ("headcount per country", GroupBy.COUNTRY),
            ("which department has the highest average salary", GroupBy.DEPARTMENT),
            ("average salary by employment type", GroupBy.EMPLOYMENT_TYPE),
        ],
    )
    def test_grouping(self, vocab, question, group_by):
        spec = rule_parser.parse(question, vocab)
        assert spec.intent == Intent.GROUP and spec.group_by == group_by

    def test_which_country_has_most_employees_is_a_count(self, vocab):
        spec = rule_parser.parse("Which country has the most employees?", vocab)
        assert (spec.intent, spec.metric, spec.group_by) == (Intent.GROUP, Metric.COUNT, GroupBy.COUNTRY)

    @pytest.mark.parametrize(
        "question,limit,order",
        [("top 3 earners in Sales", 3, "desc"), ("bottom 2 by salary", 2, "asc"), ("lowest paid contractors", 5, "asc"), ("who earns the most", 1, "desc")],
    )
    def test_ranking(self, vocab, question, limit, order):
        spec = rule_parser.parse(question, vocab)
        assert (spec.intent, spec.limit, spec.order) == (Intent.RANK, limit, order)

    def test_rank_limit_is_capped(self, vocab):
        assert rule_parser.parse("top 500 earners", vocab).limit == 50

    @pytest.mark.parametrize("question", ["salaries in the USA", "average pay for US staff", "pay in america"])
    def test_country_aliases(self, vocab, question):
        assert rule_parser.parse(question, vocab).countries == ["United States"]

    def test_lowercase_us_pronoun_is_not_a_country(self, vocab):
        assert rule_parser.parse("show us the average salary", vocab).countries == []

    def test_department_code_and_employment_type(self, vocab):
        spec = rule_parser.parse("how many part-time ENG staff", vocab)
        assert spec.departments == ["Engineering"] and spec.employment_types == [EmploymentType.PART_TIME]

    def test_role_word_becomes_job_title_filter(self, vocab):
        assert rule_parser.parse("average salary of engineers", vocab).job_title_contains == "engineer"

    def test_unrelated_question_is_unsupported(self, vocab):
        assert rule_parser.parse("what's the weather like?", vocab).intent == Intent.UNSUPPORTED


class TestExecution:
    def test_scalar_answer(self, client):
        body = client.post("/api/ai/query", json={"question": "average salary in Engineering"}).json()
        assert body["parser"] == "rules" and body["unit"] == "usd"
        assert body["value"] == pytest.approx(106_666.67)
        assert "$106,667" in body["answer"]

    def test_grouped_answer_table(self, client):
        body = client.post("/api/ai/query", json={"question": "headcount by department"}).json()
        assert body["table"]["rows"] == [["Engineering", 4], ["Sales", 2]]

    def test_rank_answer_table(self, client):
        body = client.post("/api/ai/query", json={"question": "top 2 earners"}).json()
        assert [row[0] for row in body["table"]["rows"]] == ["Alice Smith", "Bob Jones"]

    def test_no_matches(self, client):
        body = client.post("/api/ai/query", json={"question": "average salary of contractors in Germany"}).json()
        assert body["value"] is None and "No salaried employees" in body["answer"]

    def test_unsupported_includes_examples(self, client):
        body = client.post("/api/ai/query", json={"question": "tell me a joke"}).json()
        assert body["spec"] is None and "Try one of" in body["answer"]

    @pytest.mark.parametrize("question", ["", "hi", "x" * 501])
    def test_question_validation(self, client, question):
        assert client.post("/api/ai/query", json={"question": question}).status_code == 422


class FakeLLM:
    def __init__(self, result: QuerySpec | Exception) -> None:
        self.result = result
        self.calls = 0

    def parse(self, question, vocab) -> QuerySpec:
        self.calls += 1
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


class TestLLMFallback:
    def test_llm_spec_is_used_when_valid(self, db):
        llm = FakeLLM(QuerySpec(intent=Intent.AGGREGATE, metric=Metric.MAX, departments=["sales"]))
        answer = answer_question(db, "something only an LLM understands", llm)
        assert answer.parser == "llm" and answer.value == 60_000

    def test_llm_exception_falls_back_to_rules(self, db):
        llm = FakeLLM(TimeoutError("API timed out"))
        answer = answer_question(db, "average salary in Sales", llm)
        assert llm.calls == 1
        assert answer.parser == "rules" and answer.value == 45_000

    def test_llm_unsupported_falls_back_to_rules(self, db):
        answer = answer_question(db, "how many employees in India", FakeLLM(QuerySpec(intent=Intent.UNSUPPORTED)))
        assert answer.parser == "rules" and answer.value == 1

    def test_llm_hallucinated_entity_is_reported_not_executed(self, db):
        llm = FakeLLM(QuerySpec(intent=Intent.AGGREGATE, departments=["Legal"]))
        answer = answer_question(db, "average salary in legal", llm)
        assert answer.value is None and 'department called "Legal"' in answer.answer

    def test_endpoint_uses_injected_parser(self, client):
        client.app.dependency_overrides[get_llm_parser] = lambda: FakeLLM(RuntimeError("boom"))
        body = client.post("/api/ai/query", json={"question": "median salary"}).json()
        assert body["parser"] == "rules" and body["value"] == 90_000

    def test_no_api_key_means_rules_only(self, monkeypatch):
        from app.config import get_settings

        monkeypatch.setenv("ANTHROPIC_API_KEY", "")
        get_settings.cache_clear()
        get_llm_parser.cache_clear()
        try:
            assert get_llm_parser() is None
        finally:
            get_settings.cache_clear()
            get_llm_parser.cache_clear()

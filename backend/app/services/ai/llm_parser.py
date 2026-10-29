"""Claude-backed parser: turns a question into a QuerySpec via structured outputs.

The model never sees employee data and never writes SQL; it only fills in the
QuerySpec schema, which is validated before execution.
"""

import anthropic

from app.services.ai.query_spec import QuerySpec
from app.services.ai.vocabulary import Vocabulary

SYSTEM_PROMPT = """You translate an HR manager's compensation question into a QuerySpec for ACME Corp's employee database.

Data available: employees with department, country, employment type and job title, and each employee's current salary, normalised to annual USD.
Measures: base_salary (annual base pay), bonus (annual bonus), total_compensation (base + bonus; "payroll" and "cost" mean this).

Intents:
- aggregate: one number for the filtered employees ("average salary of engineers in Germany"). metric is avg, sum, min, max, median or count (count = headcount).
- group: one number per group; set group_by to department, country or employment_type ("average salary by country", "which department has the most employees").
- rank: list individual employees ordered by the measure; set limit and order ("top 5 earners in Sales" -> desc, "lowest paid contractors" -> asc).
- unsupported: anything that cannot be answered from this data (opinions, other topics, requests to change data, individual personal details beyond pay ranking).

Use department and country names exactly as listed below; leave a filter empty when the question does not restrict it.
Departments: {departments}
Countries: {countries}"""


class LLMParser:
    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self._client = anthropic.Anthropic(api_key=api_key, timeout=timeout, max_retries=1)
        self._model = model

    def parse(self, question: str, vocab: Vocabulary) -> QuerySpec:
        """Raises on any API, refusal or validation failure; the caller falls back to rules."""
        system = SYSTEM_PROMPT.format(
            departments=", ".join(sorted(d.name for d in vocab.departments)),
            countries=", ".join(sorted(c.name for c in vocab.countries)),
        )
        response = self._client.messages.parse(
            model=self._model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": question}],
            output_config={"effort": "low"},
            output_format=QuerySpec,
        )
        if response.stop_reason != "end_turn" or response.parsed_output is None:
            raise ValueError(f"LLM did not return a query spec (stop_reason={response.stop_reason})")
        return response.parsed_output

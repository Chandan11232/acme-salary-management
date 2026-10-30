# Performance considerations

The target is 10,000 employees (≈25,000 salary records with history). The guiding rule: **the browser never holds more than one page of employees, and every number on screen is computed by the database.**

## What the design does

| Concern | Approach |
|---|---|
| Listing 10k rows | Server-side pagination (`page_size` ≤ 100, enforced by the API). Count and page are two queries; the count skips the salary join unless a salary filter is active. |
| Filtering | Indexes on `department_id`, `country_id`, `employment_type`; `(last_name, first_name)` for the default sort; unique index on `email`. `EXPLAIN QUERY PLAN` for a department + country filter uses `ix_employees_country_id`. |
| Current salary | One window-function subquery (`ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY effective_date DESC, id DESC)`) backed by the `(employee_id, effective_date)` index. |
| Dashboard aggregates | `SUM`/`AVG`/`COUNT` with `GROUP BY` in SQL; median via window functions — no rows are loaded into Python. |
| Search-as-you-type | 300 ms debounce in the UI; every request carries an `AbortController` so superseded requests are cancelled and never render. |
| Seeding | Bulk `INSERT` in batches of 2,000 — 10,000 employees + 25,092 salaries in ≈0.8 s. |
| Tests | In-memory SQLite (`StaticPool`), fresh schema per test; 110 tests in ≈1 s. |

## Measured latency

Seeded database (10,000 employees, 25,092 salaries, 3.9 MB), FastAPI `TestClient`, Apple M2, median and max of 15 runs per endpoint:

| Request | Median | Max |
|---|---|---|
| `GET /api/employees` — page 1, default sort | 6 ms | 28 ms |
| `GET /api/employees` — last page (400 of 400) | 10 ms | 11 ms |
| `GET /api/employees` — search `smith` | 21 ms | 29 ms |
| `GET /api/employees` — 2 departments + 2 countries, salary 80k–150k, sorted by salary | 57 ms | 58 ms |
| `GET /api/employees/{id}` | 3 ms | 5 ms |
| `GET /api/analytics/summary` — all 10k (first request computes, the rest are cached) | 2 ms | 64 ms |
| `GET /api/analytics/summary` — one country (same) | 2 ms | 16 ms |
| `POST /api/ai/query` — "median salary by department" (rule parser) | 44 ms | 49 ms |

Reproduce from `backend/`: `python -m scripts.seed --reset && python -m scripts.benchmark`. An LLM-parsed question adds the model's latency (a few seconds) on top of the execution time; the rule parser adds <1 ms.

## Known bottlenecks and next steps

1. **The current-salary subquery ranks every salary row** when it has to: salary-range filters and salary sorting need current pay for every candidate (~55 ms locally, about 1 s on Render's free tier). Other list requests pick the page's employee ids first and rank only those employees' salaries, and the detail view ranks one employee's. Fix for the remaining case: maintain a `salaries.is_current` flag / `current_salary_id` updated transactionally when salary records change (and when a future-dated record takes effect).
2. **The dashboard summary runs four aggregate queries** (totals, median, two breakdowns). Current pay is ranked once per summary into a temporary table, only for employees matching the non-salary filters, and all four queries read that table: ~48 ms for all 10k (was ~160 ms) and 6–10 ms for a department or country. Results are also cached in-process per filter set and cleared on every commit (`app/services/summary_cache.py`), so repeat requests cost ~2 ms.
3. **`OFFSET` pagination** degrades on very deep pages for large tables. At 10k rows the last page costs only ~10 ms more than the first; beyond ~1M rows, switch to keyset (cursor) pagination on `(sort_key, id)`.
4. **Substring search** (`LIKE '%term%'`) can't use a B-tree index. Fine at 10k (57 ms); at larger scale use SQLite FTS5 or Postgres trigram indexes.
5. **SQLite serialises writes.** Irrelevant for one HR manager; for many concurrent writers, move to Postgres (the SQLAlchemy code is portable apart from the median's integer division and `current_date`).

# ACME Compensation

Salary management and analytics for ACME Corp's HR team: 10,000 employees across 6 countries, with CRUD, server-side filtering, a compensation dashboard, and a natural-language assistant.

- **Backend:** FastAPI · SQLAlchemy 2 · SQLite · Pydantic v2 (`backend/`)
- **Frontend:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 (`frontend/`)
- **AI:** Claude via structured outputs (optional), with a deterministic rule-based parser as default and fallback

See [`requirements.md`](requirements.md) for scope and [`plan.md`](plan.md) for the original plan.

## Quick start

Requires Python 3.11+ (3.12 recommended) and Node 20+.

```bash
# 1. Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed            # 10,000 employees, ~1s, deterministic
uvicorn app.main:app --port 8000  # API docs at http://localhost:8000/docs

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                       # http://localhost:3000
```

The frontend proxies `/api/*` to the backend (`next.config.ts`). If the API runs elsewhere, set `BACKEND_URL` (e.g. `BACKEND_URL=http://127.0.0.1:8100 npm run dev`). For `npm run build`, set it at **build** time, because Next.js bakes rewrites into the build.

Open the app at `http://localhost:3000`. In dev mode, Next.js blocks its dev scripts on other hosts, so the "Network" URL renders only loading skeletons. To open it from another device, start with `ALLOWED_DEV_ORIGINS=192.168.x.x npm run dev`.

Reseed from scratch with `python -m scripts.seed --reset`.

### Optional: Claude-powered parsing

```bash
cp backend/.env.example backend/.env   # then set ANTHROPIC_API_KEY
```

With a key, questions are parsed by Claude (`AI_MODEL`, default `claude-opus-5-5`, low effort). Without one, or if the call fails, times out, or returns something invalid, the rule-based parser answers. The chat UI labels which parser was used.

## Tests

```bash
cd backend && .venv/bin/python -m pytest     # 109 tests, ~1s, in-memory SQLite
cd frontend && npx tsc --noEmit && npm run lint
```

Tests use a fresh in-memory database per test with six hand-checkable employees (documented in `tests/conftest.py`). They cover pagination boundaries, every filter and sort, CRUD and error codes, current-salary resolution (multi-currency, monthly→annual, future-dated records), SQL aggregates including odd/even medians, rule parsing, and the LLM fallback chain (using fake parsers, with no network).

## Architecture

```
backend/app/
  models/      SQLAlchemy tables: Department, Country, Employee, Salary
  schemas/     Pydantic request/response models
  services/    business logic, with no FastAPI imports
    compensation.py   "current salary" subquery, normalised to annual USD
    filters.py        one filter object shared by list, analytics and AI
    analytics_service.py  avg/sum/min/max/median/count, grouped, top-N (all SQL)
    ai/               query_spec · rule_parser · llm_parser · executor · service
  routers/     thin HTTP layer; DomainError → 404/409/422 in main.py
frontend/
  app/         routes: / (dashboard), /employees, /employees/[id], /assistant
  components/  ui/ (kit), dashboard/, employees/, ai/
  lib/         typed API client, types, formatters, hooks
```

### Key design decisions

- **Salary history, with a derived current salary.** `salaries` holds every record. The *current* salary is the latest record with `effective_date <= today`, picked with a `ROW_NUMBER()` window function. Future-dated raises are stored but don't count until they take effect. Nothing is denormalised, so it can't drift.
- **Multi-currency.** Amounts are stored in local currency. `base_salary` is per pay period (annual, monthly or bi-weekly) and `bonus` is annual. Analytics, salary filters and sorting use annual USD (`× periods × exchange_rate_to_usd`), rounded to cents in SQL.
- **Scale (10k rows).** Lists are always paginated on the server (max 100 per page). Search is debounced, and stale requests are cancelled with `AbortController`. Filter columns and `(employee_id, effective_date)` are indexed. Aggregates, including the median (via window functions, since SQLite has no `MEDIAN`), run in SQL. On the seeded data, the full dashboard summary takes ~175 ms and a filtered, salary-sorted page ~45 ms.
- **Safe AI.** The LLM never writes SQL and never sees employee data. It fills a typed `QuerySpec` (intent, metric, measure, filters, grouping, limit) through structured outputs. The executor resolves entity names against the database (an unknown name like "Legal" gets a clear reply instead of a query) and runs only whitelisted aggregations.
- **Errors.** Services raise domain errors that map to 404/409/422, with messages such as `An employee with email … already exists`. The frontend shows field-level messages in forms, toasts for actions, and retryable banners for failed loads.

### Trade-offs and limitations

- **SQLite** keeps setup to zero, but writes are serialised. Postgres would be the production choice, and the SQLAlchemy code is portable except for `func.current_date()` and integer-division semantics in the median.
- **Money is stored as floats**, rounded to cents at the query boundary. A production system should use integer minor units or `NUMERIC`.
- **Exchange rates are static** seed values. There's no rate history, so historical USD figures use today's rate.
- **The rule parser** is keyword-based: it handles the common question shapes (see suggestions in the UI) but not arbitrary phrasing. That's the job of the LLM path.
- **No authentication or audit log.** Both are out of scope per `requirements.md`, but a real HR tool needs both.
- **UI components** are a small hand-built kit (native `<dialog>`, Tailwind tokens with light/dark themes) instead of shadcn/ui, to avoid a CLI-generated dependency tree. The structure maps one-to-one if you want to swap it in.

## API overview

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/employees` | `page`, `page_size≤100`, `sort_by`, `sort_order`, `search`, repeatable `department_id`/`country_id`/`employment_type`, `min_salary`/`max_salary` (USD) |
| POST / GET / PATCH / DELETE | `/api/employees[/{id}]` | create accepts an optional initial `salary` |
| GET / POST | `/api/employees/{id}/salaries` | salary history, newest first |
| PATCH / DELETE | `/api/salaries/{id}` | |
| GET | `/api/departments`, `/api/countries` | reference data |
| GET | `/api/analytics/summary` | headcount, payroll, avg/median, breakdowns, filterable |
| POST | `/api/ai/query` | `{ "question": "…" }` → answer, interpretation, optional table |

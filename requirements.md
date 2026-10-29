# Requirements: ACME Corp Salary Management

## Goal
Replace the spreadsheets ACME's HR team uses to manage compensation for ~10,000 employees across several countries with a web application. The HR manager should be able to **maintain salary data** reliably and **answer questions about how the org pays people** in seconds instead of hours.

## User
**HR Manager** — the only persona. They are comfortable with spreadsheets, not SQL. Their recurring questions look like: *"What do we pay engineers in Germany?"*, *"Which department costs the most?"*, *"Who are our top earners in Sales?"*, *"How many contractors do we have in India?"*

## Scope & features

| # | Feature | Why it matters to the HR manager |
|---|---|---|
| 1 | **Employee directory**: search by name/email/title, filter by department, country, employment type and salary range, sort, paginate | Finding one person or a slice of 10k rows is the most frequent spreadsheet task |
| 2 | **Employee CRUD**: create (optionally with an initial salary), view, edit, delete | Joiners, transfers and leavers |
| 3 | **Salary history**: each employee has dated salary records (base, bonus, pay frequency); the latest record effective on or before today is the *current* salary; future-dated records are shown as scheduled | Raises are planned ahead and auditors ask "what was X paid in 2023"; overwriting a cell loses that |
| 4 | **Multi-currency**: amounts stored in local currency, analytics normalised to annual USD | Pay is set locally, but org-level questions need one unit |
| 5 | **Dashboard**: headcount, total payroll, average and median salary, breakdown by department and country, filterable | The "how do we pay people" overview at a glance; median guards against outliers skewing the average |
| 6 | **AI assistant**: natural-language questions answered from live data, showing how the question was interpreted | Ad-hoc questions without building a pivot table; showing the interpretation lets HR trust (or correct) the answer |

## Non-functional requirements
- **Scale:** 10,000 employees without loading them into the browser — server-side pagination (≤100/page), indexed filter columns, aggregates computed in SQL.
- **Correctness:** input validation with clear messages and correct HTTP codes (404 missing, 409 duplicate email, 422 invalid input); money compared at cent precision.
- **Safety of AI answers:** the model never writes or executes SQL and never sees employee records; it only fills a typed query spec that the server validates and executes.
- **Works offline:** runs locally with zero external services. The AI assistant degrades to a deterministic rule-based parser without an API key or when the LLM fails.
- **Quality:** fast, deterministic unit tests (in-memory SQLite, whole suite in seconds).

## Deliberately out of scope

| Left out | Reasoning |
|---|---|
| Authentication, roles, permissions | Essential in production for salary data, but a single-persona assessment gains little from a login screen; the API is structured so an auth dependency can be added per router. |
| Audit log of who changed what | Salary history already preserves *what* changed and when; *who* needs authentication first. |
| Payroll processing (payslips, tax, deductions) | A different product; the problem is managing and understanding salary data, not paying it. |
| Live / historical FX rates | Static rates make every number reproducible and testable; rate history would complicate every aggregate for little value in a demo. Called out as a known limitation. |
| Bulk Excel import/export | Valuable for migration from spreadsheets, but the seed script covers the "existing data" case; a CSV importer is the natural next feature. |
| Approval workflows for raises | Requires roles and notifications; out of proportion to the core problem. |
| Free-form charts / report builder | The dashboard plus the AI assistant cover the stated questions; a builder is a large surface to get right. |
| Postgres / multi-instance deployment | SQLite keeps setup at zero; the ORM layer keeps the switch small. |

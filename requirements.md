# Requirements: ACME Corp Salary Management

## Problem
ACME's HR team manages compensation for ~10,000 employees across several countries in spreadsheets. This is slow, error-prone, and makes simple questions ("what's our Engineering payroll in Germany?") take hours.

## Users
- **HR Manager** (primary): browses, filters, and edits employee and salary records; asks ad-hoc compensation questions.

## Functional requirements
1. **Employees** — list, search (name/email/job title), filter (department, country, employment type, salary range), sort, paginate server-side; create, view, update, delete.
2. **Salaries** — each employee has a salary history (base, bonus, effective date, pay frequency). The latest record by effective date is the *current* salary. HR can add new salary records and edit/delete existing ones.
3. **Analytics dashboard** — headcount, total annual payroll (USD), average and median salary, breakdown by department and by country. All aggregates are computed in SQL.
4. **Multi-currency** — salaries are stored in local currency; analytics normalise to USD using each country's exchange rate.
5. **AI assistant** — natural-language questions (e.g. *"average salary in Engineering in Germany"*, *"top 5 earners in Sales"*, *"headcount by country"*) are translated into a **structured, validated query spec** (never raw SQL) and executed safely. Works offline via a deterministic rule-based parser; optionally uses Claude when `ANTHROPIC_API_KEY` is set, falling back to the rule parser on any failure.

## Non-functional requirements
- Handles 10,000 employees without loading everything into memory on the client; list endpoints are paginated (max 100/page).
- Indexed foreign keys and filter columns.
- Input validation with descriptive errors and correct HTTP status codes (400/404/409/422).
- Backend unit tests run against in-memory SQLite in under 5 seconds.
- Runs locally with zero external services (SQLite, no required API keys).

## Out of scope
Authentication/authorization, payroll processing, audit logging, live FX rates.

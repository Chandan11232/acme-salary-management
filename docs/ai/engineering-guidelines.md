# Developer Guidelines & Engineering Standards for Claude Code

> The instruction file given to the AI coding agent (Claude Code) at the start of the build, together with [`plan.md`](../../plan.md). Reproduced verbatim.

When assisting with this assessment, strictly adhere to the following engineering standards, architectural patterns, and workflow protocols:

## 1. Code Quality & Clean Architecture
* **Modularity:** Keep files small, single-responsibility, and well-structured. Avoid monolithic files in both FastAPI (`routers/`, `models/`, `schemas/`, `services/`) and Next.js (`app/`, `components/`, `lib/`).
* **Type Safety:** Use strict type hints in Python (`pydantic` models, type annotations) and TypeScript interface definitions in Next.js.
* **Error Handling:** Implement descriptive error handling with appropriate HTTP status codes on the backend and friendly toast/banner notifications on the frontend.

## 2. Testing Standards
* **Backend Unit Tests:** Write fast, deterministic unit tests using `pytest` and `sqlite` in-memory databases. Tests must run independently and execute in under 5 seconds.
* **Coverage:** Cover critical paths: employee filtering, salary calculations, pagination boundaries, and AI query parsing fallback logic.

## 3. Git Workflow & Incremental Commits
* **Granular Commits:** Make logical, atomic commits as each sub-phase is completed (e.g., `feat(db): add SQLAlchemy models and 10k seed script`). Avoid dumping all code in a single final commit.
* **Commit Message Format:** Use conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).

## 4. Performance & Scale Considerations (10,000 Records)
* **Never load all records at once into memory on the frontend.** Always utilize server-side pagination, database indexing on frequently filtered columns (`department_id`, `country_id`), and efficient SQL aggregations (`SUM`, `AVG`, `GROUP BY`) for analytics dashboards.

## 5. AI Tool Intentionality
* Use AI assistance to accelerate boilerplate creation, seed script generation, and Tailwind styling, but rigorously review all generated code for security, correctness, edge cases, and deterministic behavior.

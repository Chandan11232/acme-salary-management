# Engineering Plan: ACME Corp Employee Salary Management & AI Analytics

## 1. Project Overview & Goal
Build a full-stack, production-ready employee salary management application for 10,000 employees across multiple countries. The system replaces tedious Excel workflows with a robust web interface supporting CRUD operations, advanced filtering, and a natural language AI analytics chat feature for HR managers.

## 2. Tech Stack Selection
* **Backend:** FastAPI (Python) for high performance, async support, and native Pydantic validation.
* **Database & ORM:** SQLite with SQLAlchemy (lightweight, zero-config relational database perfect for assessment portability).
* **Frontend:** Next.js 14+ (React) with Tailwind CSS and shadcn/ui components for a polished, responsive dashboard.
* **AI Integration:** Local/API-driven lightweight natural language text-to-SQL or semantic search engine query pipeline for answering compensation questions.

## 3. Architecture & Data Schema
### Database Entities
1. **Departments:** `id`, `name`, `code`
2. **Countries/Locations:** `id`, `country_name`, `currency_code`, `exchange_rate_to_usd`
3. **Employees:** `id`, `first_name`, `last_name`, `email`, `department_id`, `country_id`, `job_title`, `hire_date`, `employment_type` (Full-time, Contract, Part-time)
4. **Salaries:** `id`, `employee_id`, `base_salary`, `bonus`, `effective_date`, `pay_frequency`

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Project Scaffolding & Requirements (Commit 1 & 2)
* [ ] Initialize Git repository and create the one-page requirements document (`requirements.md`).
* [ ] Set up monorepo structure (`/backend` and `/frontend`).
* [ ] Initialize FastAPI backend project structure, dependencies (`requirements.txt`), and database configuration.
* [ ] Initialize Next.js frontend with Tailwind CSS and base layout components.

### Phase 2: Database Design & 10,000-Record Seed Script (Commit 3)
* [ ] Implement SQLAlchemy models (`Department`, `Country`, `Employee`, `Salary`).
* [ ] Write a robust seed script (`seed.py`) using Faker to generate realistic records for exactly 10,000 employees across 5+ countries and departments.
* [ ] Verify data integrity, foreign key constraints, and seed performance.

### Phase 3: Backend REST API & Unit Testing (Commit 4 & 5)
* [ ] Implement CRUD endpoints for Employees and Salaries (`/api/employees`, `/api/salaries`, `/api/analytics/summary`).
* [ ] Add robust server-side pagination, sorting, and multi-field filtering (by department, country, salary range).
* [ ] Write comprehensive unit tests (`pytest`) covering core business logic, filtering, and aggregation queries.

### Phase 4: Frontend Dashboard & UI Development (Commit 6 & 7)
* [ ] Build the main HR Dashboard layout with metrics cards (Total Payroll, Avg Salary, Headcount, Department Breakdown).
* [ ] Implement the interactive 10,000-record data table with server-side pagination, instant search, and filter drawers.
* [ ] Build employee detail view and modal forms for adding/editing salary data.

### Phase 5: AI Natural Language Analytics Interface (Commit 8)
* [ ] Implement an AI assistant/query endpoint that translates natural language questions (e.g., *"What is the average salary in the Engineering department in Germany?"*) into safe database queries or aggregations.
* [ ] Build a sleek chat UI component in Next.js allowing the HR Manager to query compensation data conversationally.

### Phase 6: Polish, Documentation & Verification (Commit 9 & 10)
* [ ] Finalize README.md with setup instructions, architecture notes, and trade-off explanations.
* [ ] Record a short video walkthrough/demo of the application.
* [ ] Perform final code review, cleanup, and ensure all tests pass cleanly.
# AI workflow

How AI tools were used to build this project, what they were trusted with, and how their output was verified.

## Tools

| Tool | Used for |
|---|---|
| **Claude Code** (agentic coding CLI, Claude Opus 5.5) | Implementation, tests, refactors, debugging, documentation, running the app and taking screenshots to verify the UI |
| **Claude API** (inside the product) | Optional natural-language → `QuerySpec` parsing for the AI assistant |

## Inputs given to the agent

1. **[`plan.md`](../plan.md)** — the engineering plan: stack, schema, and a phased roadmap (scaffold → DB & seed → API & tests → UI → AI → polish).
2. **[`docs/ai/engineering-guidelines.md`](ai/engineering-guidelines.md)** — standing instructions: modular structure, strict typing, error handling, fast in-memory tests on named critical paths, conventional atomic commits, never loading 10k rows on the client, and a requirement to *review all generated code for security, correctness, edge cases and determinism*.
3. **The assessment brief** — used later to audit the result against the stated requirements (see *Course corrections*).

The opening prompt was: the guidelines file plus *"I have inserted the plan.md file in this folder, so start building a working project for this assessment."* Follow-up prompts were short and corrective — pasted error output ("still, the data is not loading, it's all skeleton"), questions ("does this really solve the assessment requirements?"), and the brief itself.

## Working loop

Each phase of `plan.md` followed the same loop:

1. **Read before writing.** Before using a library version newer than the model's training data, the agent read the installed docs or source: the Next.js 16 docs bundled in `node_modules/next/dist/docs` (rewrites, `PageProps`, `useSearchParams` prerendering), the Anthropic SDK's `messages.parse` signature (to confirm `output_config` and `output_format` merge), and the `@tailwindcss/turbopack` README.
2. **Write the smallest working slice**, then smoke-test it against the real seeded database (timings and sample outputs printed) before moving on.
3. **Write tests against hand-calculable fixtures.** The test dataset is six employees whose expected USD figures are documented at the top of `tests/conftest.py`, so every assertion can be checked by hand rather than trusted because "the code produced it".
4. **Verify end to end** — production build, both servers running, `curl` through the proxy, and headless-Chrome screenshots of each page, inspected visually.
5. **Commit** with a conventional message per sub-phase.

## Where AI output was wrong — and how it was caught

Generated code was treated as a draft. These are the defects that verification caught:

| # | Defect in generated code | Caught by | Fix |
|---|---|---|---|
| 1 | Salary-range filter excluded an employee paid exactly 110,000 USD: `100000 × 1.1 = 110000.00000000001` | Unit test `test_salary_range_uses_usd_and_excludes_unsalaried` | Round USD to cents inside the SQL expression |
| 2 | Median wrong for even-sized groups: SQLAlchemy 2's `/` is true division, so the "middle row" index was `2.5` | Unit test on an even group (Sales median = 45,000) | Use `//` |
| 3 | After changing an employee's department, the response still showed the old department (stale relationship in the session identity map) | Unit test `test_partial_update` | `populate_existing=True` on the detail query |
| 4 | Overwriting `next.config.ts` to add the API proxy silently removed the generated Tailwind loader | Build warning `Unknown at rule: @theme`, then checking the CSS bundle for utility classes | Restore the `@tailwindcss/turbopack` rule |
| 5 | Assumed `BACKEND_URL` was read at runtime; Next.js bakes rewrites in at **build** time, so the proxy hit another app on port 8000 | End-to-end `curl` through the proxy returned a Django 404 page | Documented; rebuild with the variable set |
| 6 | Opening the dev server via its LAN IP rendered only skeletons — Next 16 blocks dev scripts for non-localhost origins, so React never hydrated | Headless Chrome DOM dump comparing `localhost` vs the LAN IP | Use `localhost`; opt-in `ALLOWED_DEV_ORIGINS` env var |
| 7 | App crashed at import when run on a Python without the optional `anthropic` package | User's error report | Lazy import; fall back to the rule parser |

Two of these (1, 2) would have produced *plausible-looking wrong numbers* on the dashboard — the class of bug that is most dangerous in a salary tool and the reason the fixtures are hand-calculable.

## Decisions kept with the human

The agent was used to propose and implement; these calls were made explicitly by the developer:

- **Stack.** The brief prefers the role's stack (Java/Angular) but allows any. Presented with "rebuild in Spring Boot + Angular" vs "keep FastAPI + Next.js", the developer chose to keep the current stack to submit sooner.
- **Component library.** The agent first built a small hand-rolled Tailwind kit, deviating from the plan. When auditing against the plan and brief, the developer asked for everything specified to be used; the UI was migrated to **shadcn/ui** and filters moved into a drawer (commit `refactor(frontend): migrate UI to shadcn/ui …`).

Agent behaviour worth noting: it asked before any decision that changed scope (the stack), and it did not take actions with side-effects it couldn't verify — it didn't open tracked links in the recruitment email (that would register a click on the candidate's behalf) and didn't kill processes it couldn't confirm it had started.

## Guardrails designed into the AI feature

The same scepticism applied to the product's own use of an LLM:

- The model **never writes SQL** and **never sees employee data** — it receives the question plus department and country *names*, and must return a schema-validated `QuerySpec` (Claude structured outputs → Pydantic).
- Entity names are re-validated against the database; an invented department ("Legal") produces a clear reply, not a query.
- Any LLM failure — timeout, API error, refusal, invalid output, or "unsupported" — falls back to a deterministic rule parser. The UI labels which parser answered and shows the interpretation, so the HR manager can see *what* was computed.
- Tests replace the LLM with fakes (valid spec, exception, unsupported, hallucinated entity), so the suite is fast, offline and deterministic.

## What AI accelerated most

- Boilerplate: SQLAlchemy models, Pydantic schemas, routers, typed API client, shadcn component wiring.
- The deterministic 10k seed script (locale-aware names, salary bands per department × country cost-of-labour, 1–3 record histories).
- Test enumeration — parametrised cases for every filter, sort, metric and parser phrase.
- Diagnosis — reading tracebacks, dumping rendered DOM, comparing origins and query plans.

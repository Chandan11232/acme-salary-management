"""Measure API latency against the seeded database.

Usage (from backend/, after `python -m scripts.seed`):  python -m scripts.benchmark [--runs 15]
Prints a Markdown table of median and max latency per request (in-process, via TestClient).
"""

import argparse
import statistics
import time

from fastapi.testclient import TestClient

from app.main import app

CASES: list[tuple[str, str, str, dict]] = [
    ("`GET /api/employees` — page 1, default sort", "get", "/api/employees", {}),
    ("`GET /api/employees` — last page (400 of 400)", "get", "/api/employees", {"page": 400}),
    ("`GET /api/employees` — search `smith`", "get", "/api/employees", {"search": "smith"}),
    (
        "`GET /api/employees` — 2 departments + 2 countries, salary 80k–150k, sorted by salary",
        "get",
        "/api/employees",
        {"department_id": [1, 8], "country_id": [1, 2], "min_salary": 80_000, "max_salary": 150_000, "sort_by": "salary", "sort_order": "desc"},
    ),
    ("`GET /api/employees/{id}`", "get", "/api/employees/5", {}),
    ("`GET /api/analytics/summary` — all 10k", "get", "/api/analytics/summary", {}),
    ("`GET /api/analytics/summary` — one country", "get", "/api/analytics/summary", {"country_id": 3}),
    ("`POST /api/ai/query` — \"median salary by department\" (rule parser)", "post", "/api/ai/query", {"question": "median salary by department"}),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--runs", type=int, default=15)
    args = parser.parse_args()

    client = TestClient(app)
    print("| Request | Median | Max |\n|---|---|---|")
    for label, method, path, payload in CASES:
        timings = []
        for _ in range(args.runs):
            started = time.perf_counter()
            response = client.get(path, params=payload) if method == "get" else client.post(path, json=payload)
            timings.append((time.perf_counter() - started) * 1000)
            response.raise_for_status()
        print(f"| {label} | {statistics.median(timings):.0f} ms | {max(timings):.0f} ms |")


if __name__ == "__main__":
    main()

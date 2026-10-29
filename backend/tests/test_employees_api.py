import pytest

NEW_EMPLOYEE = {
    "first_name": " Grace ",
    "last_name": "Hopper",
    "email": "Grace@ACME.example",
    "department_id": 1,
    "country_id": 1,
    "job_title": "Principal Engineer",
    "hire_date": "2024-02-01",
    "employment_type": "FULL_TIME",
}


def ids(response) -> list[int]:
    return [item["id"] for item in response.json()["items"]]


class TestPagination:
    def test_first_page_metadata(self, client):
        body = client.get("/api/employees", params={"page_size": 4}).json()
        assert (body["total"], body["page"], body["page_size"], body["pages"]) == (6, 1, 4, 2)
        assert len(body["items"]) == 4

    def test_last_partial_page(self, client):
        body = client.get("/api/employees", params={"page_size": 4, "page": 2}).json()
        assert len(body["items"]) == 2

    def test_page_beyond_last_is_empty(self, client):
        body = client.get("/api/employees", params={"page_size": 4, "page": 3}).json()
        assert body["items"] == [] and body["total"] == 6

    def test_pages_do_not_overlap(self, client):
        first = ids(client.get("/api/employees", params={"page_size": 3, "page": 1}))
        second = ids(client.get("/api/employees", params={"page_size": 3, "page": 2}))
        assert len(set(first) | set(second)) == 6

    @pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
    def test_invalid_pagination_rejected(self, client, params):
        assert client.get("/api/employees", params=params).status_code == 422


class TestFiltering:
    def test_by_department(self, client):
        assert sorted(ids(client.get("/api/employees", params={"department_id": 2}))) == [3, 4]

    def test_by_multiple_countries(self, client):
        assert sorted(ids(client.get("/api/employees", params={"country_id": [2, 3]}))) == [2, 4]

    def test_by_employment_type(self, client):
        assert ids(client.get("/api/employees", params={"employment_type": "CONTRACT"})) == [3]

    def test_combined_filters(self, client):
        response = client.get("/api/employees", params={"department_id": 1, "country_id": 1, "employment_type": "FULL_TIME"})
        assert sorted(ids(response)) == [1, 6]

    @pytest.mark.parametrize("term,expected", [("alice", [1]), ("SMITH", [1]), ("bob jones", [2]), ("engineer", [1, 2, 5, 6]), ("acme.example", [1, 2, 3, 4, 5, 6])])
    def test_search(self, client, term, expected):
        assert sorted(ids(client.get("/api/employees", params={"search": term}))) == expected

    def test_search_wildcards_are_literal(self, client):
        assert client.get("/api/employees", params={"search": "%"}).json()["total"] == 0

    def test_salary_range_uses_usd_and_excludes_unsalaried(self, client):
        response = client.get("/api/employees", params={"min_salary": 60_000, "max_salary": 110_000})
        assert sorted(ids(response)) == [2, 3, 6]
        assert response.json()["total"] == 3

    def test_inverted_salary_range_rejected(self, client):
        response = client.get("/api/employees", params={"min_salary": 10, "max_salary": 5})
        assert response.status_code == 400


class TestSorting:
    def test_salary_desc_puts_unsalaried_last(self, client):
        response = client.get("/api/employees", params={"sort_by": "salary", "sort_order": "desc"})
        assert ids(response) == [1, 2, 6, 3, 4, 5]

    def test_salary_asc_puts_unsalaried_last(self, client):
        response = client.get("/api/employees", params={"sort_by": "salary", "sort_order": "asc"})
        assert ids(response) == [4, 3, 6, 2, 1, 5]

    def test_by_country(self, client):
        names = [i["country"]["country_name"] for i in client.get("/api/employees", params={"sort_by": "country"}).json()["items"]]
        assert names == sorted(names)

    def test_invalid_sort_field_rejected(self, client):
        assert client.get("/api/employees", params={"sort_by": "password"}).status_code == 422


class TestCurrentCompensation:
    def test_latest_record_is_current(self, client):
        comp = client.get("/api/employees/1").json()["current_compensation"]
        assert comp["annual_base_usd"] == 120_000 and comp["total_comp_usd"] == 130_000

    def test_converted_to_usd(self, client):
        comp = client.get("/api/employees/2").json()["current_compensation"]
        assert comp["currency_code"] == "EUR"
        assert comp["base_salary"] == 100_000
        assert comp["annual_base_usd"] == pytest.approx(110_000)

    def test_monthly_pay_is_annualised(self, client):
        assert client.get("/api/employees/3").json()["current_compensation"]["annual_base_usd"] == 60_000

    def test_future_dated_record_ignored(self, client):
        detail = client.get("/api/employees/6").json()
        assert detail["current_compensation"]["annual_base_usd"] == 90_000
        assert len(detail["salaries"]) == 2

    def test_no_salary_record(self, client):
        assert client.get("/api/employees/5").json()["current_compensation"] is None


class TestCrud:
    def test_create_normalises_input_and_adds_salary(self, client):
        payload = {**NEW_EMPLOYEE, "salary": {"base_salary": 150_000, "bonus": 15_000, "effective_date": "2024-02-01"}}
        response = client.post("/api/employees", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["first_name"] == "Grace" and body["email"] == "grace@acme.example"
        assert body["current_compensation"]["total_comp_usd"] == 165_000
        assert client.get("/api/employees").json()["total"] == 7

    def test_create_duplicate_email_conflicts(self, client):
        response = client.post("/api/employees", json={**NEW_EMPLOYEE, "email": "ALICE@acme.example"})
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_with_unknown_department(self, client):
        response = client.post("/api/employees", json={**NEW_EMPLOYEE, "department_id": 99})
        assert response.status_code == 422
        assert response.json()["detail"] == "Department 99 does not exist"

    @pytest.mark.parametrize("field,value", [("email", "not-an-email"), ("first_name", ""), ("employment_type", "INTERN")])
    def test_create_validation(self, client, field, value):
        assert client.post("/api/employees", json={**NEW_EMPLOYEE, field: value}).status_code == 422

    def test_partial_update(self, client):
        response = client.patch("/api/employees/1", json={"job_title": "Principal Engineer", "department_id": 2})
        assert response.status_code == 200
        body = response.json()
        assert body["job_title"] == "Principal Engineer" and body["department"]["name"] == "Sales"
        assert body["last_name"] == "Smith"

    def test_update_to_taken_email_conflicts(self, client):
        assert client.patch("/api/employees/1", json={"email": "bob@acme.example"}).status_code == 409

    def test_update_keeping_own_email_is_allowed(self, client):
        assert client.patch("/api/employees/1", json={"email": "alice@acme.example"}).status_code == 200

    def test_update_null_required_field_rejected(self, client):
        assert client.patch("/api/employees/1", json={"first_name": None}).status_code == 422

    def test_delete_cascades_salaries(self, client, db):
        from app.models import Salary

        assert client.delete("/api/employees/1").status_code == 204
        assert client.get("/api/employees/1").status_code == 404
        assert db.query(Salary).filter_by(employee_id=1).count() == 0

    @pytest.mark.parametrize("method", ["get", "patch", "delete"])
    def test_missing_employee_404(self, client, method):
        kwargs = {"json": {}} if method == "patch" else {}
        response = getattr(client, method)("/api/employees/999", **kwargs)
        assert response.status_code == 404
        assert response.json()["detail"] == "Employee 999 not found"


def test_reference_endpoints(client):
    assert [d["code"] for d in client.get("/api/departments").json()] == ["ENG", "SAL"]
    assert [c["currency_code"] for c in client.get("/api/countries").json()] == ["EUR", "INR", "USD"]

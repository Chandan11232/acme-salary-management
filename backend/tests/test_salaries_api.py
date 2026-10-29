def test_list_history_newest_first(client):
    dates = [s["effective_date"] for s in client.get("/api/employees/1/salaries").json()]
    assert dates == ["2023-01-01", "2020-01-01"]


def test_new_record_becomes_current(client):
    response = client.post("/api/employees/1/salaries", json={"base_salary": 130_000, "bonus": 0, "effective_date": "2025-01-01"})
    assert response.status_code == 201
    assert client.get("/api/employees/1").json()["current_compensation"]["annual_base_usd"] == 130_000


def test_backdated_record_does_not_replace_current(client):
    client.post("/api/employees/1/salaries", json={"base_salary": 50_000, "effective_date": "2010-01-01"})
    assert client.get("/api/employees/1").json()["current_compensation"]["annual_base_usd"] == 120_000


def test_first_salary_for_unsalaried_employee(client):
    client.post("/api/employees/5/salaries", json={"base_salary": 2_000, "effective_date": "2024-01-01", "pay_frequency": "BIWEEKLY"})
    assert client.get("/api/employees/5").json()["current_compensation"]["annual_base_usd"] == 52_000


def test_validation(client):
    assert client.post("/api/employees/1/salaries", json={"base_salary": 0, "effective_date": "2024-01-01"}).status_code == 422
    assert client.post("/api/employees/1/salaries", json={"base_salary": 1, "bonus": -1, "effective_date": "2024-01-01"}).status_code == 422


def test_unknown_employee(client):
    assert client.post("/api/employees/999/salaries", json={"base_salary": 1, "effective_date": "2024-01-01"}).status_code == 404
    assert client.get("/api/employees/999/salaries").status_code == 404


def test_update_and_delete(client):
    salary_id = client.get("/api/employees/2/salaries").json()[0]["id"]
    response = client.patch(f"/api/salaries/{salary_id}", json={"bonus": 7_000})
    assert response.status_code == 200 and response.json()["bonus"] == 7_000
    assert client.delete(f"/api/salaries/{salary_id}").status_code == 204
    assert client.get("/api/employees/2").json()["current_compensation"] is None
    assert client.delete(f"/api/salaries/{salary_id}").status_code == 404

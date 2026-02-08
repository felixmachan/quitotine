from datetime import datetime, timezone
from uuid import uuid4


def _auth_header(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": f"{uuid4()}@example.com", "password": "StrongPass1!"},
    )
    token = register.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_program(client, headers):
    return client.post(
        "/api/v1/programs",
        headers=headers,
        json={
            "goal_type": "reduce_to_zero",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "product_profile": {
                "product_type": "cigarette",
                "baseline_amount": 10,
                "unit_label": "cigs",
                "strength_mg": 1.0,
                "cost_per_unit": 0.5,
            },
        },
    )


def test_diary_requires_18_utc_cutoff(client, monkeypatch):
    from app.api.v1.endpoints import diary as diary_endpoint

    headers = _auth_header(client)
    program = _create_program(client, headers)
    assert program.status_code == 200

    monkeypatch.setattr(diary_endpoint, "_now_utc", lambda: datetime(2026, 2, 7, 17, 0, tzinfo=timezone.utc))
    blocked = client.post("/api/v1/diary", headers=headers, json={"mood": 6, "note": "before cutoff"})
    assert blocked.status_code == 400

    monkeypatch.setattr(diary_endpoint, "_now_utc", lambda: datetime(2026, 2, 7, 18, 5, tzinfo=timezone.utc))
    created = client.post("/api/v1/diary", headers=headers, json={"mood": 7, "note": "evening check-in"})
    assert created.status_code == 200
    created_body = created.json()
    assert created_body["mood"] == 7
    assert created_body["entry_date"] == "2026-02-07"

    duplicate = client.post("/api/v1/diary", headers=headers, json={"mood": 8, "note": "second same-day"})
    assert duplicate.status_code == 409


def test_diary_list_returns_entries(client, monkeypatch):
    from app.api.v1.endpoints import diary as diary_endpoint

    headers = _auth_header(client)
    program = _create_program(client, headers)
    assert program.status_code == 200

    monkeypatch.setattr(diary_endpoint, "_now_utc", lambda: datetime(2026, 2, 7, 19, 0, tzinfo=timezone.utc))
    created = client.post("/api/v1/diary", headers=headers, json={"mood": 5, "note": "test note"})
    assert created.status_code == 200

    listed = client.get("/api/v1/diary?start=2026-02-01&end=2026-02-28", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["mood"] == 5
    assert body[0]["note"] == "test note"

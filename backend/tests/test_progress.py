from datetime import datetime, timedelta, timezone


def _auth_header(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "c@example.com", "password": "StrongPass1!"},
    )
    token = register.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_program(client, headers, started_at):
    return client.post(
        "/api/v1/programs",
        headers=headers,
        json={
            "goal_type": "reduce_to_zero",
            "started_at": started_at.isoformat(),
            "product_profile": {
                "product_type": "vape",
                "baseline_amount": 20,
                "unit_label": "ml",
                "strength_mg": 3.0,
                "cost_per_unit": 1.0,
            },
        },
    )


def test_progress_endpoint(client):
    headers = _auth_header(client)
    started_at = datetime.now(timezone.utc) - timedelta(days=10)
    program = _create_program(client, headers, started_at)
    assert program.status_code == 200

    event = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "event_type": "use",
            "amount": 5,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert event.status_code == 200

    progress = client.get("/api/v1/progress", headers=headers)
    assert progress.status_code == 200
    body = progress.json()
    assert "progress_percent" in body
    assert body["baseline_daily_amount"] == 20

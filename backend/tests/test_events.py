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


def test_create_event(client):
    headers = _auth_header(client)
    program = _create_program(client, headers)
    assert program.status_code == 200

    event = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "event_type": "use",
            "amount": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert event.status_code == 200
    body = event.json()
    assert body["event_type"] == "use"


def test_list_events_can_filter_cravings(client):
    headers = _auth_header(client)
    program = _create_program(client, headers)
    assert program.status_code == 200

    craving = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "event_type": "craving",
            "intensity": 7,
            "trigger": "stress",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert craving.status_code == 200

    use_event = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "event_type": "use",
            "amount": 1,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert use_event.status_code == 200

    filtered = client.get("/api/v1/events?event_type=craving", headers=headers)
    assert filtered.status_code == 200
    body = filtered.json()
    assert len(body) == 1
    assert body[0]["event_type"] == "craving"
    assert body[0]["intensity"] == 7

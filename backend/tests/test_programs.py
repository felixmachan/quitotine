from datetime import datetime, timedelta, timezone
from uuid import uuid4


def _auth_header(client):
    register = client.post(
        "/api/v1/auth/register",
        json={"email": f"{uuid4()}@example.com", "password": "StrongPass1!"},
    )
    token = register.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_program(client, headers):
    started_at = datetime.now(timezone.utc) - timedelta(days=7)
    return client.post(
        "/api/v1/programs",
        headers=headers,
        json={
            "goal_type": "reduce_to_zero",
            "started_at": started_at.isoformat(),
            "product_profile": {
                "product_type": "vape",
                "baseline_amount": 12,
                "unit_label": "ml",
                "strength_mg": 6,
                "cost_per_unit": 1.5,
            },
        },
    )


def test_update_active_product_profile_cost(client):
    headers = _auth_header(client)
    create = _create_program(client, headers)
    assert create.status_code == 200

    update = client.patch(
        "/api/v1/programs/active/product-profile",
        headers=headers,
        json={"cost_per_unit": 2.75},
    )
    assert update.status_code == 200
    body = update.json()
    assert body["product_profile"]["cost_per_unit"] == 2.75


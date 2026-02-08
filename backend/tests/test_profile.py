from datetime import datetime, timezone
from uuid import UUID
from uuid import uuid4

from sqlalchemy.orm import sessionmaker

from app.models.models import Event, ProductProfile, Program, RefreshToken, User


def _register(client, email: str):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass1!"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_delete_profile_removes_user_and_related_data(client, db_engine):
    email = f"{uuid4()}@example.com"
    token = _register(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/v1/profile", headers=headers)
    assert me.status_code == 200
    user_id = UUID(me.json()["id"])

    create_program = client.post(
        "/api/v1/programs",
        headers=headers,
        json={
            "goal_type": "reduce_to_zero",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "product_profile": {
                "product_type": "vape",
                "baseline_amount": 10,
                "unit_label": "pieces",
                "strength_mg": 8,
                "cost_per_unit": 1.2,
            },
        },
    )
    assert create_program.status_code == 200

    create_event = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "event_type": "craving",
            "intensity": 6,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert create_event.status_code == 200

    delete_me = client.delete("/api/v1/profile", headers=headers)
    assert delete_me.status_code == 200
    assert delete_me.json()["detail"] == "ok"

    using_old_token = client.get("/api/v1/profile", headers=headers)
    assert using_old_token.status_code == 401

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    db = TestingSessionLocal()
    try:
        assert db.query(User).filter(User.id == user_id).count() == 0
        assert db.query(Program).filter(Program.user_id == user_id).count() == 0
        assert db.query(RefreshToken).filter(RefreshToken.user_id == user_id).count() == 0
        assert (
            db.query(Event)
            .join(Program, Event.program_id == Program.id)
            .filter(Program.user_id == user_id)
            .count()
            == 0
        )
        assert (
            db.query(ProductProfile)
            .join(Program, ProductProfile.program_id == Program.id)
            .filter(Program.user_id == user_id)
            .count()
            == 0
        )
    finally:
        db.close()

    register_again = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StrongPass1!"},
    )
    assert register_again.status_code == 200

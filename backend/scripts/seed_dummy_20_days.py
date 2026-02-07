from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal  # noqa: E402
from app.models.enums import EventType, GoalType, ProductType, TriggerType  # noqa: E402
from app.models.event import Event  # noqa: E402
from app.models.product_profile import ProductProfile  # noqa: E402
from app.models.program import Program  # noqa: E402
from app.models.user import User  # noqa: E402

SEED_NOTE_PREFIX = "[seed-20d]"


def pick_user(session, email: str | None) -> User:
    if email:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            raise RuntimeError(f"No user found for email: {email}")
        return user

    user = session.query(User).order_by(User.created_at.asc()).first()
    if not user:
        raise RuntimeError("No users found. Register a user first.")
    return user


def ensure_program(session, user: User) -> Program:
    program = (
        session.query(Program)
        .filter(Program.user_id == user.id, Program.is_active.is_(True))
        .order_by(Program.created_at.desc())
        .first()
    )
    if program:
        if not program.product_profile:
            session.add(
                ProductProfile(
                    program_id=program.id,
                    product_type=ProductType.cigarette.value,
                    baseline_amount=12,
                    unit_label="cigs/day",
                    strength_mg=1.0,
                    cost_per_unit=0.6,
                )
            )
            session.commit()
            session.refresh(program)
        return program

    started_at = datetime.now(timezone.utc) - timedelta(days=24)
    program = Program(
        user_id=user.id,
        goal_type=GoalType.reduce_to_zero.value,
        started_at=started_at,
        is_active=True,
    )
    session.add(program)
    session.flush()

    profile = ProductProfile(
        program_id=program.id,
        product_type=ProductType.cigarette.value,
        baseline_amount=12,
        unit_label="cigs/day",
        strength_mg=1.0,
        cost_per_unit=0.6,
    )
    session.add(profile)
    session.commit()
    session.refresh(program)
    return program


def reseed_events(session, program: Program, days: int = 20) -> dict:
    deleted = (
        session.query(Event)
        .filter(
            Event.program_id == program.id,
            Event.notes.isnot(None),
            Event.notes.like(f"{SEED_NOTE_PREFIX}%"),
        )
        .delete(synchronize_session=False)
    )
    session.commit()

    random.seed(42)
    now = datetime.now(timezone.utc)
    inserted = 0
    relapse_days = {6, 15}

    for idx in range(days):
        day_offset = days - 1 - idx
        day_date = (now - timedelta(days=day_offset)).date()

        use_amount = max(0.5, 11.5 - (idx * 0.35) + random.uniform(-0.4, 0.5))
        use_dt = datetime(day_date.year, day_date.month, day_date.day, 9, 10, tzinfo=timezone.utc)
        session.add(
            Event(
                program_id=program.id,
                event_type=EventType.use.value,
                amount=round(use_amount, 2),
                intensity=None,
                trigger=None,
                notes=f"{SEED_NOTE_PREFIX} daily amount",
                occurred_at=use_dt,
            )
        )
        inserted += 1

        cravings_today = 2 if idx % 3 else 3
        for c in range(cravings_today):
            craving_dt = datetime(day_date.year, day_date.month, day_date.day, 11 + (c * 4), 25, tzinfo=timezone.utc)
            intensity = max(2, min(9, int(7 - (idx * 0.2) + random.uniform(-1.2, 1.1))))
            trigger = random.choice(
                [
                    TriggerType.stress.value,
                    TriggerType.boredom.value,
                    TriggerType.after_meal.value,
                    TriggerType.social.value,
                    TriggerType.morning.value,
                ]
            )
            session.add(
                Event(
                    program_id=program.id,
                    event_type=EventType.craving.value,
                    amount=None,
                    intensity=intensity,
                    trigger=trigger,
                    notes=f"{SEED_NOTE_PREFIX} craving",
                    occurred_at=craving_dt,
                )
            )
            inserted += 1

        if idx in relapse_days:
            relapse_dt = datetime(day_date.year, day_date.month, day_date.day, 21, 15, tzinfo=timezone.utc)
            relapse_amount = round(max(1.5, 5.0 - idx * 0.12), 2)
            session.add(
                Event(
                    program_id=program.id,
                    event_type=EventType.relapse.value,
                    amount=relapse_amount,
                    intensity=8,
                    trigger=TriggerType.stress.value,
                    notes=f"{SEED_NOTE_PREFIX} relapse event",
                    occurred_at=relapse_dt,
                )
            )
            inserted += 1

    session.commit()

    recent_7 = (
        session.query(Event)
        .filter(
            Event.program_id == program.id,
            Event.occurred_at >= now - timedelta(days=7),
        )
        .count()
    )

    return {"deleted_seed_events": deleted, "inserted_events": inserted, "recent_7_day_events": recent_7}


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed 20 days of dummy events into backend DB.")
    parser.add_argument("--email", help="Target user email. Defaults to first user.")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        user = pick_user(session, args.email)
        program = ensure_program(session, user)
        summary = reseed_events(session, program, days=20)
        print(
            {
                "user_email": user.email,
                "program_id": str(program.id),
                "days_seeded": 20,
                **summary,
            }
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()

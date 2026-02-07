from __future__ import annotations

from datetime import datetime, date, time, timedelta, timezone
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.program import Program
from app.models.event import Event
from app.models.enums import EventType, TriggerType

SEED_PREFIXES = ("[seed-20d]", "[seed-jan1]")


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def main() -> None:
    target_email = "felix.machan@gmail.com"
    start_day = date(2026, 1, 1)
    end_day = date(2026, 2, 7)

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == target_email).first()
        if not user:
            raise RuntimeError(f"User not found: {target_email}")

        program = (
            session.query(Program)
            .filter(Program.user_id == user.id, Program.is_active.is_(True))
            .order_by(Program.created_at.desc())
            .first()
        )
        if not program:
            raise RuntimeError("No active program found for user")

        program.started_at = datetime.combine(start_day, time(0, 0), tzinfo=timezone.utc)
        session.flush()

        deleted_total = 0
        for prefix in SEED_PREFIXES:
            deleted = (
                session.query(Event)
                .filter(
                    Event.program_id == program.id,
                    Event.notes.isnot(None),
                    Event.notes.like(f"{prefix}%"),
                )
                .delete(synchronize_session=False)
            )
            deleted_total += deleted
        session.flush()

        random.seed(20260207)
        inserted = 0
        relapse_days = {date(2026, 1, 9), date(2026, 1, 24), date(2026, 2, 3)}
        slots = [0, 4, 8, 12, 16, 20]

        for idx, day in enumerate(daterange(start_day, end_day)):
            trend = max(2.8, 11.5 - idx * 0.18)
            daily_use = round(max(1.0, trend + random.uniform(-0.5, 0.45)), 2)

            use_dt = datetime.combine(day, time(9, 10), tzinfo=timezone.utc)
            session.add(
                Event(
                    program_id=program.id,
                    event_type=EventType.use.value,
                    amount=daily_use,
                    intensity=None,
                    trigger=None,
                    notes="[seed-jan1] daily amount",
                    occurred_at=use_dt,
                )
            )
            inserted += 1

            slot_base = idx % 6
            craving_slots = [slot_base, (slot_base + 2) % 6, (slot_base + 4) % 6]
            for cidx, slot_index in enumerate(craving_slots):
                hour = slots[slot_index] + random.choice([0, 1, 2, 3])
                intensity_center = max(2.0, min(9.0, 7.2 - idx * 0.08 + (0.6 if cidx == 0 else 0)))
                intensity = int(max(1, min(10, round(intensity_center + random.uniform(-1.0, 1.0)))))
                craving_dt = datetime.combine(day, time(hour, random.choice([10, 20, 35, 50])), tzinfo=timezone.utc)
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
                        notes="[seed-jan1] craving",
                        occurred_at=craving_dt,
                    )
                )
                inserted += 1

            if day in relapse_days:
                relapse_dt = datetime.combine(day, time(21, 15), tzinfo=timezone.utc)
                session.add(
                    Event(
                        program_id=program.id,
                        event_type=EventType.relapse.value,
                        amount=round(random.uniform(2.0, 4.8), 2),
                        intensity=8,
                        trigger=TriggerType.stress.value,
                        notes="[seed-jan1] relapse",
                        occurred_at=relapse_dt,
                    )
                )
                inserted += 1

        session.commit()

        seeded = (
            session.query(Event)
            .filter(
                Event.program_id == program.id,
                Event.notes.isnot(None),
                Event.notes.like("[seed-jan1]%"),
            )
            .all()
        )
        by_type = {}
        for row in seeded:
            by_type[row.event_type] = by_type.get(row.event_type, 0) + 1

        print(
            {
                "user": user.email,
                "program_id": str(program.id),
                "started_at": program.started_at.isoformat(),
                "range": [str(start_day), str(end_day)],
                "deleted_seed_events": deleted_total,
                "inserted_events": inserted,
                "seed_counts": by_type,
                "seed_total": len(seeded),
            }
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()

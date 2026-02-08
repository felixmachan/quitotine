from datetime import datetime, timezone, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.enums import EventType
from app.models.models import DiaryEntry, Event, ProductProfile, Program, User
from app.schemas.program import (
    ProductProfileCostUpdate,
    ProgramCreate,
    ProgramOut,
    TestCravingOut,
    TestResetOut,
    TestSeedDayOut,
)
from app.security.dependencies import get_current_user

router = APIRouter()


@router.post("", response_model=ProgramOut)
def create_program(
    payload: ProgramCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_active = (
        db.query(Program)
        .filter(Program.user_id == current_user.id, Program.is_active.is_(True))
        .first()
    )
    if existing_active:
        existing_active.is_active = False
        existing_active.ended_at = datetime.now(timezone.utc)

    program = Program(
        user_id=current_user.id,
        goal_type=payload.goal_type.value,
        started_at=payload.started_at,
        is_active=True,
    )
    profile = ProductProfile(
        product_type=payload.product_profile.product_type.value,
        baseline_amount=payload.product_profile.baseline_amount,
        unit_label=payload.product_profile.unit_label,
        strength_mg=payload.product_profile.strength_mg,
        cost_per_unit=payload.product_profile.cost_per_unit,
    )
    program.product_profile = profile

    db.add(program)
    db.commit()
    db.refresh(program)
    return program


@router.get("/active", response_model=ProgramOut)
def get_active_program(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = (
        db.query(Program)
        .filter(Program.user_id == current_user.id, Program.is_active.is_(True))
        .first()
    )
    if not program:
        raise HTTPException(status_code=404, detail="No active program")
    return program


@router.patch("/active/product-profile", response_model=ProgramOut)
def update_active_product_profile(
    payload: ProductProfileCostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = (
        db.query(Program)
        .filter(Program.user_id == current_user.id, Program.is_active.is_(True))
        .first()
    )
    if not program:
        raise HTTPException(status_code=404, detail="No active program")
    if not program.product_profile:
        raise HTTPException(status_code=404, detail="No product profile for active program")

    program.product_profile.cost_per_unit = payload.cost_per_unit
    db.commit()
    db.refresh(program)
    return program


@router.get("", response_model=list[ProgramOut])
def list_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Program).filter(Program.user_id == current_user.id).order_by(Program.started_at.desc()).all()


def _ensure_test_or_development() -> None:
    env = settings.environment.strip().lower()
    if env not in {"test", "development"}:
        raise HTTPException(status_code=403, detail="Test helper endpoints are disabled in this environment.")


@router.post("/active/test/seed-random-day", response_model=TestSeedDayOut)
def seed_random_test_day(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_test_or_development()

    program = (
        db.query(Program)
        .filter(Program.user_id == current_user.id, Program.is_active.is_(True))
        .first()
    )
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()

    latest_diary_date = (
        db.query(func.max(DiaryEntry.entry_date))
        .filter(DiaryEntry.program_id == program.id)
        .scalar()
    )
    latest_event_date = (
        db.query(func.max(func.date(Event.occurred_at)))
        .filter(Event.program_id == program.id)
        .scalar()
    )
    max_date = today
    if latest_diary_date and latest_diary_date > max_date:
        max_date = latest_diary_date
    if latest_event_date and latest_event_date > max_date:
        max_date = latest_event_date

    next_date = max_date + timedelta(days=1)
    mood = random.randint(1, 10)
    note = "Test dummy diary entry."
    craving_count = random.randint(0, 10)

    diary_entry = DiaryEntry(
        program_id=program.id,
        entry_date=next_date,
        mood=mood,
        note=note,
    )
    db.add(diary_entry)

    cravings_out: list[TestCravingOut] = []
    for _ in range(craving_count):
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        intensity = random.randint(0, 10)
        occurred_at = datetime(
            next_date.year,
            next_date.month,
            next_date.day,
            hour,
            minute,
            tzinfo=timezone.utc,
        )
        event = Event(
            program_id=program.id,
            event_type=EventType.craving.value,
            intensity=intensity,
            occurred_at=occurred_at,
        )
        db.add(event)
        cravings_out.append(TestCravingOut(occurred_at=occurred_at, intensity=intensity))

    db.commit()

    return TestSeedDayOut(
        date=next_date.isoformat(),
        mood=mood,
        note=note,
        craving_count=craving_count,
        cravings=cravings_out,
    )


@router.post("/active/test/reset-progress", response_model=TestResetOut)
def reset_test_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_test_or_development()

    program = (
        db.query(Program)
        .filter(Program.user_id == current_user.id, Program.is_active.is_(True))
        .first()
    )
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    deleted_diary = db.execute(delete(DiaryEntry).where(DiaryEntry.program_id == program.id)).rowcount or 0
    deleted_events = db.execute(delete(Event).where(Event.program_id == program.id)).rowcount or 0
    started_at = datetime.now(timezone.utc)
    program.started_at = started_at
    db.commit()

    return TestResetOut(
        ok=True,
        deleted_diary_entries=deleted_diary,
        deleted_events=deleted_events,
        started_at=started_at,
    )


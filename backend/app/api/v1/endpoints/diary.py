from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.models.models import DiaryEntry, Program, User
from app.schemas.diary import DiaryEntryCreate, DiaryEntryOut
from app.security.dependencies import get_current_user

router = APIRouter()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_active_program(db: Session, user_id):
    return (
        db.query(Program)
        .filter(Program.user_id == user_id, Program.is_active.is_(True))
        .first()
    )


@router.post("", response_model=DiaryEntryOut)
def create_diary_entry(
    payload: DiaryEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = _now_utc()
    if now.hour < settings.diary_log_start_hour:
        raise HTTPException(
            status_code=400,
            detail=f"Diary logging is available after {settings.diary_log_start_hour:02d}:00 UTC.",
        )

    program = _get_active_program(db, current_user.id)
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    today = now.date()
    existing = (
        db.query(DiaryEntry)
        .filter(DiaryEntry.program_id == program.id, DiaryEntry.entry_date == today)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Diary entry already exists for today")

    entry = DiaryEntry(
        program_id=program.id,
        entry_date=today,
        mood=payload.mood,
        note=payload.note,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[DiaryEntryOut])
def list_diary_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
):
    program = _get_active_program(db, current_user.id)
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    query = db.query(DiaryEntry).filter(DiaryEntry.program_id == program.id)
    if start:
        query = query.filter(DiaryEntry.entry_date >= start)
    if end:
        query = query.filter(DiaryEntry.entry_date <= end)

    return query.order_by(DiaryEntry.entry_date.desc(), DiaryEntry.created_at.desc()).all()

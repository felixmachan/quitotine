from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.event import Event
from app.models.program import Program
from app.schemas.event import EventCreate, EventOut
from app.security.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_active_program(db: Session, user_id):
    return (
        db.query(Program)
        .filter(Program.user_id == user_id, Program.is_active.is_(True))
        .first()
    )


@router.post("", response_model=EventOut)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    program = get_active_program(db, current_user.id)
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    event = Event(
        program_id=program.id,
        event_type=payload.event_type.value,
        amount=payload.amount,
        intensity=payload.intensity,
        trigger=payload.trigger.value if payload.trigger else None,
        notes=payload.notes,
        occurred_at=payload.occurred_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
):
    program = get_active_program(db, current_user.id)
    if not program:
        raise HTTPException(status_code=404, detail="No active program")

    query = db.query(Event).filter(Event.program_id == program.id)
    if start:
        query = query.filter(Event.occurred_at >= start)
    if end:
        query = query.filter(Event.occurred_at <= end)

    return query.order_by(Event.occurred_at.desc()).all()

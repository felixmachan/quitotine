from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Event, Program, User
from app.schemas.progress import ProgressOut
from app.security.dependencies import get_current_user
from app.services.progress import calculate_progress

router = APIRouter()


@router.get("", response_model=ProgressOut)
def get_progress(
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

    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=7)
    relapse_cutoff = now - timedelta(days=30)

    recent_events = (
        db.query(Event)
        .filter(Event.program_id == program.id, Event.occurred_at >= recent_cutoff)
        .all()
    )
    relapse_events = (
        db.query(Event)
        .filter(Event.program_id == program.id, Event.event_type == "relapse", Event.occurred_at >= relapse_cutoff)
        .all()
    )

    result = calculate_progress(program, recent_events, relapse_events, now)
    return ProgressOut(**result)


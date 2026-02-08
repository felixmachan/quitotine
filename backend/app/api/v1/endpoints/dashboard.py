from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Event, Program, User
from app.schemas.progress import DashboardOut
from app.security.dependencies import get_current_user
from app.services.progress import calculate_progress, select_message_of_the_day

router = APIRouter()


@router.get("", response_model=DashboardOut)
def get_dashboard(
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
    cravings_count = (
        db.query(Event)
        .filter(Event.program_id == program.id, Event.event_type == "craving", Event.occurred_at >= recent_cutoff)
        .count()
    )

    progress = calculate_progress(program, recent_events, relapse_events, now)

    baseline = progress["baseline_daily_amount"]
    recent_avg = progress["recent_average_daily_amount"]
    days_since = progress["days_since_start"]
    cost_per_unit = program.product_profile.cost_per_unit
    money_saved = None
    if cost_per_unit is not None:
        daily_savings = max(baseline - recent_avg, 0) * float(cost_per_unit)
        money_saved = round(daily_savings * days_since, 2)

    message = select_message_of_the_day(days_since)

    return DashboardOut(
        progress_percent=progress["progress_percent"],
        days_since_start=days_since,
        baseline_daily_amount=baseline,
        recent_average_daily_amount=recent_avg,
        money_saved_estimate=money_saved,
        cravings_last_7_days=cravings_count,
        relapses_last_30_days=len(relapse_events),
        message_of_the_day=message,
    )


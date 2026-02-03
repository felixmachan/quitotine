from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.program import Program
from app.models.product_profile import ProductProfile
from app.schemas.program import ProgramCreate, ProgramOut
from app.security.dependencies import get_current_user
from app.models.user import User

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


@router.get("", response_model=list[ProgramOut])
def list_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Program).filter(Program.user_id == current_user.id).order_by(Program.started_at.desc()).all()

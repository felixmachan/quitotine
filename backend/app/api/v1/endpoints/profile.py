from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserOut, UserUpdate, UserPasswordUpdate
from app.security.dependencies import get_current_user
from app.security.passwords import hash_password, validate_password_strength
from app.models.user import User

router = APIRouter()


@router.get("", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/password")
def update_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_password_strength(payload.password)
    current_user.password_hash = hash_password(payload.password)
    db.commit()
    return {"detail": "ok"}

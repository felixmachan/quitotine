from datetime import datetime, timedelta, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import RefreshToken, User
from app.schemas.auth import UserRegister, UserLogin, TokenPair, TokenRefresh
from app.security.passwords import verify_password, hash_password, validate_password_strength
from app.security.jwt import create_access_token, create_refresh_token, decode_token
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=TokenPair)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    validate_password_strength(payload.password)
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="User already registered")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    access_token = create_access_token(user.id)
    refresh_token, jti = create_refresh_token(user.id)

    try:
        db.add(RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        ))
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(user.id)
    refresh_token, jti = create_refresh_token(user.id)

    db.add(RefreshToken(
        user_id=user.id,
        jti=jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))
    db.commit()

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: TokenRefresh, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = decoded.get("jti")
    token_row = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not token_row or token_row.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Invalid token")

    if token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Token expired")

    user_id = uuid.UUID(decoded.get("sub"))
    access_token = create_access_token(user_id)
    new_refresh_token, new_jti = create_refresh_token(user_id)

    token_row.revoked_at = datetime.now(timezone.utc)
    token_row.replaced_by = new_jti
    db.add(RefreshToken(
        user_id=user_id,
        jti=new_jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))
    db.commit()

    return TokenPair(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(payload: TokenRefresh, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = decoded.get("jti")
    token_row = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if token_row and token_row.revoked_at is None:
        token_row.revoked_at = datetime.now(timezone.utc)
        db.commit()

    return {"detail": "ok"}


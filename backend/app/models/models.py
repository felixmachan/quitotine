import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Uuid, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import EventType, GoalType, ProductType, TriggerType


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    programs = relationship("Program", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True)
    goal_type: Mapped[str] = mapped_column(String(20), nullable=False, default=GoalType.reduce_to_zero.value)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="programs")
    product_profile = relationship("ProductProfile", back_populates="program", uselist=False, cascade="all, delete-orphan")
    events = relationship("Event", back_populates="program", cascade="all, delete-orphan")
    diary_entries = relationship("DiaryEntry", back_populates="program", cascade="all, delete-orphan")


class ProductProfile(Base):
    __tablename__ = "product_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("programs.id"), unique=True)
    product_type: Mapped[str] = mapped_column(String(30), nullable=False, default=ProductType.cigarette.value)
    baseline_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_label: Mapped[str] = mapped_column(String(50), nullable=False)
    strength_mg: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cost_per_unit: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    program = relationship("Program", back_populates="product_profile")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("programs.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(20), nullable=False, default=EventType.use.value)
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trigger: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    program = relationship("Program", back_populates="events")


class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    __table_args__ = (UniqueConstraint("program_id", "entry_date", name="uq_diary_program_date"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("programs.id"), index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    program = relationship("Program", back_populates="diary_entries")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id"), index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")

__all__ = [
    "User",
    "Program",
    "ProductProfile",
    "Event",
    "DiaryEntry",
    "RefreshToken",
    "ProductType",
    "GoalType",
    "EventType",
    "TriggerType",
]

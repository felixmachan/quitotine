import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import EventType, TriggerType


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

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Numeric, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ProductType


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

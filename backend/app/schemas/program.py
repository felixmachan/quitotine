from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GoalType, ProductType


class ProductProfileCreate(BaseModel):
    product_type: ProductType
    baseline_amount: float = Field(gt=0)
    unit_label: str = Field(min_length=1, max_length=50)
    strength_mg: float | None = Field(default=None, gt=0)
    cost_per_unit: float | None = Field(default=None, gt=0)


class ProductProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_type: ProductType
    baseline_amount: float
    unit_label: str
    strength_mg: float | None
    cost_per_unit: float | None


class ProgramCreate(BaseModel):
    goal_type: GoalType
    started_at: datetime
    product_profile: ProductProfileCreate


class ProductProfileCostUpdate(BaseModel):
    cost_per_unit: float | None = Field(default=None, gt=0)


class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    goal_type: GoalType
    started_at: datetime
    is_active: bool
    ended_at: datetime | None
    product_profile: ProductProfileOut


class TestCravingOut(BaseModel):
    occurred_at: datetime
    intensity: int


class TestSeedDayOut(BaseModel):
    date: str
    mood: int
    note: str
    craving_count: int
    cravings: list[TestCravingOut]


class TestResetOut(BaseModel):
    ok: bool
    deleted_diary_entries: int
    deleted_events: int
    started_at: datetime

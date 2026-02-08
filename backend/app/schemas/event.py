from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import EventType, TriggerType


class EventCreate(BaseModel):
    event_type: EventType
    amount: float | None = Field(default=None, gt=0)
    intensity: int | None = Field(default=None, ge=1, le=10)
    trigger: TriggerType | None = None
    notes: str | None = Field(default=None, max_length=500)
    occurred_at: datetime

    @model_validator(mode="after")
    def validate_amounts(self):
        if self.event_type in {EventType.use, EventType.relapse} and self.amount is None:
            raise ValueError("amount is required for use/relapse")
        return self


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: EventType
    amount: float | None
    intensity: int | None
    trigger: TriggerType | None
    notes: str | None
    occurred_at: datetime

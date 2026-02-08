from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DiaryEntryCreate(BaseModel):
    mood: int = Field(ge=1, le=10)
    note: str | None = Field(default=None, max_length=500)


class DiaryEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entry_date: date
    mood: int
    note: str | None
    created_at: datetime

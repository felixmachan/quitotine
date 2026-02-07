from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str | None = None


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)


class UserPasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)

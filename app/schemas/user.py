from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str | None = None


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)

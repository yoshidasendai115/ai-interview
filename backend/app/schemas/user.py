"""User related schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for creating a user from SSO."""

    mintoku_user_id: str
    email: EmailStr
    name: str
    organization: str | None = None
    jlpt_level: str | None = Field(None, pattern=r"^N[1-5]$")


class UserResponse(BaseModel):
    """User response schema."""

    id: str
    mintoku_user_id: str
    email: str
    name: str
    organization: str | None = None
    jlpt_level: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Schema for updating user information."""

    name: str | None = None
    organization: str | None = None
    jlpt_level: str | None = Field(None, pattern=r"^N[1-5]$")

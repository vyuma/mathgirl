"""Pydantic models for user API."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    user_id: UUID
    user_name: str
    email: str | None
    avatar_url: str | None
    affinity: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AffinityGainRequest(BaseModel):
    gain: int


class AffinityGainResponse(BaseModel):
    affinity: int
    gained: int

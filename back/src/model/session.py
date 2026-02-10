"""Pydantic models for session/message/note API."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# --- Session ---

class SessionCreate(BaseModel):
    text_content: str | None = None
    title: str | None = None
    user_id: UUID | None = None  # v1: uses default user


class SessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    title: str | None
    status: str
    text_content: str | None
    meta_info: dict | None
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    session_id: UUID
    title: str | None
    status: str
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}


# --- Message ---

class MessageResponse(BaseModel):
    message_id: UUID
    session_id: UUID
    role: str
    content: str
    content_type: str
    metadata_: dict | None = Field(None, alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Note ---

class NoteBlock(BaseModel):
    block_id: str
    type: str  # "markdown" | "mathlive"
    content: str | None = None
    latex: str | None = None
    mathjson: dict | list | None = None


class NoteUpdate(BaseModel):
    content_blocks: list[NoteBlock] | None = None
    content_text: str | None = None


class NoteResponse(BaseModel):
    note_id: UUID
    session_id: UUID
    user_id: UUID
    content_blocks: list | None
    content_text: str | None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

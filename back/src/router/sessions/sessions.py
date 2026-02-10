import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from db.repositories import SessionRepository, MessageRepository
from model.session import (
    SessionCreate,
    SessionResponse,
    SessionListItem,
    MessageResponse,
)

router = APIRouter()

# v1 デフォルトユーザーID
DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    user_id = body.user_id or DEFAULT_USER_ID
    repo = SessionRepository(db)
    session = await repo.create(
        user_id=user_id,
        title=body.title,
        text_content=body.text_content,
    )
    return session


@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or DEFAULT_USER_ID
    repo = SessionRepository(db)
    sessions = await repo.list_by_user(uid)
    return sessions


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    session = await repo.end_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = MessageRepository(db)
    messages = await repo.list_by_session(session_id)
    return messages

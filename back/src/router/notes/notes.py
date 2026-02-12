import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.dependencies import get_db
from db.models import User
from db.repositories import NoteRepository, SessionRepository
from model.session import NoteUpdate, NoteResponse

router = APIRouter()


@router.get("/sessions/{session_id}/note", response_model=NoteResponse | None)
async def get_note(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    repo = NoteRepository(db)
    note = await repo.get_by_session(session_id)
    if note is None:
        return None
    return note


@router.put("/sessions/{session_id}/note", response_model=NoteResponse)
async def update_note(
    session_id: uuid.UUID,
    body: NoteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    repo = NoteRepository(db)
    blocks = [b.model_dump() for b in body.content_blocks] if body.content_blocks else None
    note = await repo.upsert(
        session_id=session_id,
        user_id=user.user_id,
        content_blocks=blocks,
        content_text=body.content_text,
    )
    return note

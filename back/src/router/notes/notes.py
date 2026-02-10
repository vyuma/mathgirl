import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from db.repositories import NoteRepository
from model.session import NoteUpdate, NoteResponse

router = APIRouter()

DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.get("/sessions/{session_id}/note", response_model=NoteResponse | None)
async def get_note(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repo = NoteRepository(db)
    note = await repo.get_by_session(session_id)
    if note is None:
        return None
    return note


@router.put("/sessions/{session_id}/note", response_model=NoteResponse)
async def update_note(
    session_id: uuid.UUID,
    body: NoteUpdate,
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    uid = user_id or DEFAULT_USER_ID
    repo = NoteRepository(db)
    blocks = [b.model_dump() for b in body.content_blocks] if body.content_blocks else None
    note = await repo.upsert(
        session_id=session_id,
        user_id=uid,
        content_blocks=blocks,
        content_text=body.content_text,
    )
    return note

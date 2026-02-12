import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Note


class NoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_session(self, session_id: uuid.UUID) -> Note | None:
        result = await self.db.execute(
            select(Note).where(Note.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        content_blocks: list | None = None,
        content_text: str | None = None,
    ) -> Note:
        note = await self.get_by_session(session_id)
        if note is None:
            note = Note(
                session_id=session_id,
                user_id=user_id,
                content_blocks=content_blocks,
                content_text=content_text,
            )
            self.db.add(note)
        else:
            if content_blocks is not None:
                note.content_blocks = content_blocks
            if content_text is not None:
                note.content_text = content_text
            note.version += 1
        await self.db.flush()
        return note

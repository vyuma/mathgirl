import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import DialogMessage


class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        content_type: str = "text",
        metadata: dict | None = None,
    ) -> DialogMessage:
        msg = DialogMessage(
            session_id=session_id,
            role=role,
            content=content,
            content_type=content_type,
            metadata_=metadata,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def list_by_session(self, session_id: uuid.UUID) -> list[DialogMessage]:
        result = await self.db.execute(
            select(DialogMessage)
            .where(DialogMessage.session_id == session_id)
            .order_by(DialogMessage.created_at)
        )
        return list(result.scalars().all())

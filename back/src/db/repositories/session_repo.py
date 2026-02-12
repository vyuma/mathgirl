import uuid
from datetime import datetime, timezone

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Session


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        title: str | None = None,
        text_content: str | None = None,
    ) -> Session:
        session = Session(
            user_id=user_id,
            title=title,
            text_content=text_content,
            status="active",
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_by_id(self, session_id: uuid.UUID) -> Session | None:
        result = await self.db.execute(
            select(Session).where(Session.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[Session]:
        result = await self.db.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .order_by(desc(Session.started_at))
        )
        return list(result.scalars().all())

    async def end_session(self, session_id: uuid.UUID) -> Session | None:
        session = await self.get_by_id(session_id)
        if session is None:
            return None
        session.status = "completed"
        session.ended_at = datetime.now(timezone.utc)
        await self.db.flush()
        return session

    async def delete(self, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        session = await self.get_by_id(session_id)
        if session is None or session.user_id != user_id:
            return False
        await self.db.delete(session)
        await self.db.flush()
        return True

    async def update_title(
        self, session_id: uuid.UUID, title: str
    ) -> Session | None:
        session = await self.get_by_id(session_id)
        if session is None:
            return None
        session.title = title
        await self.db.flush()
        return session

    async def update_meta_info(
        self, session_id: uuid.UUID, meta_info: dict
    ) -> Session | None:
        session = await self.get_by_id(session_id)
        if session is None:
            return None
        session.meta_info = meta_info
        await self.db.flush()
        return session

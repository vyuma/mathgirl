import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_google_id(self, google_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

    async def find_or_create_by_google(
        self,
        google_id: str,
        email: str | None,
        name: str,
        avatar_url: str | None,
    ) -> User:
        user = await self.get_by_google_id(google_id)
        if user is not None:
            user.user_name = name
            if email:
                user.email = email
            if avatar_url:
                user.avatar_url = avatar_url
            await self.db.flush()
            return user

        user = User(
            google_id=google_id,
            user_name=name,
            email=email,
            avatar_url=avatar_url,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def add_affinity(self, user_id: uuid.UUID, gain: int) -> None:
        await self.db.execute(
            update(User)
            .where(User.user_id == user_id)
            .values(affinity=User.affinity + gain)
        )
        await self.db.flush()

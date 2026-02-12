"""FastAPI auth dependencies."""

import os
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db
from db.models import User
from db.repositories import UserRepository

from .google_verify import verify_google_id_token

AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() == "true"
DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current user from the Authorization Bearer token.

    When AUTH_REQUIRED is false, falls back to the default user.
    """
    repo = UserRepository(db)

    if credentials and credentials.credentials:
        try:
            payload = await verify_google_id_token(credentials.credentials)
            user = await repo.find_or_create_by_google(
                google_id=payload["sub"],
                email=payload.get("email"),
                name=payload.get("name", "Unknown"),
                avatar_url=payload.get("picture"),
            )
            return user
        except Exception:
            if AUTH_REQUIRED:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                )

    # No credentials provided
    if AUTH_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Fallback to default user for dev mode
    user = await repo.get_by_id(DEFAULT_USER_ID)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default user not found",
        )
    return user


async def verify_ws_token(token: str | None, db: AsyncSession) -> User | None:
    """Verify a WebSocket token (passed as query param).

    Returns User on success, None on failure.
    """
    repo = UserRepository(db)

    if token:
        try:
            payload = await verify_google_id_token(token)
            return await repo.find_or_create_by_google(
                google_id=payload["sub"],
                email=payload.get("email"),
                name=payload.get("name", "Unknown"),
                avatar_url=payload.get("picture"),
            )
        except Exception:
            pass

    if not AUTH_REQUIRED:
        return await repo.get_by_id(DEFAULT_USER_ID)

    return None

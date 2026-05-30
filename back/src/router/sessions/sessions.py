import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.dependencies import get_db
from db.models import User
from db.repositories import SessionRepository, MessageRepository
from db.repositories.user_repo import UserRepository
from model.session import (
    SessionCreate,
    SessionResponse,
    SessionListItem,
    MessageResponse,
)
from service.session_summary import generate_session_summary
from service.affinity import calculate_affinity_gain

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    session = await repo.create(
        user_id=user.user_id,
        title=body.title,
        text_content=body.text_content,
    )
    return session


@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    sessions = await repo.list_by_user(user.user_id)
    return sessions


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session


@router.patch("/sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    session = await repo.end_session(session_id)

    # タイトル未設定の場合、対話内容から自動要約を生成
    msg_repo = MessageRepository(db)
    if not session.title:
        try:
            messages = await msg_repo.list_by_session(session_id)
            summary = await generate_session_summary(messages)
            if summary:
                session = await repo.update_title(session_id, summary)
        except Exception:
            logger.exception("セッション要約の生成に失敗しました: %s", session_id)

    # 親密度を更新
    try:
        messages = await msg_repo.list_by_session(session_id)
        gain = calculate_affinity_gain(messages)
        await UserRepository(db).add_affinity(user.user_id, gain)
    except Exception:
        logger.exception("親密度の更新に失敗しました: %s", session_id)

    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SessionRepository(db)
    deleted = await repo.delete(session_id, user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return Response(status_code=204)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
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
    repo = MessageRepository(db)
    messages = await repo.list_by_session(session_id)
    return messages

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.dependencies import get_db
from db.models import User
from db.repositories import SessionRepository
from model.slido import SlideGenerateRequest, SlideGenerateResponse
from service.slido import SlidoService

router = APIRouter()


@router.post("/slides/generate", response_model=SlideGenerateResponse)
async def generate_slides(
    body: SlideGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session_context = None
    if body.session_id:
        session = await SessionRepository(db).get_by_id(uuid.UUID(body.session_id))
        if session and session.user_id == user.user_id:
            session_context = session.text_content

    markdown, html = await SlidoService().generate_slides(body.topic, session_context, body.slide_count)
    return SlideGenerateResponse(slide_id=str(uuid.uuid4()), html=html, markdown=markdown)

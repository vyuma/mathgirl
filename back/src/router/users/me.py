from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.dependencies import get_db
from db.models import User
from db.repositories.user_repo import UserRepository
from model.user import UserResponse, AffinityGainRequest, AffinityGainResponse

router = APIRouter()


@router.get("/users/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/users/me/affinity", response_model=AffinityGainResponse)
async def add_affinity(
    body: AffinityGainRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gain = max(0, min(body.gain, 100))  # 0〜100 でクランプ
    await UserRepository(db).add_affinity(user.user_id, gain)
    await db.flush()
    await db.refresh(user)
    return AffinityGainResponse(affinity=user.affinity, gained=gain)

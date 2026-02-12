# FastAPIプロジェクトのメインアプリケーションファイル
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from db import init_db, async_session_factory
from db.models import User
from router.speak_chat import chat_ws_router, chat_router, speakers_router, synthesis_router, turntaking_ws_router
from router.sessions import sessions_router
from router.notes import notes_router
from router.ocr import ocr_router
from router.materials import materials_router

AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() == "true"
DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時: DB初期化
    await init_db()

    # AUTH_REQUIRED=false の場合のみデフォルトユーザーを作成
    if not AUTH_REQUIRED:
        async with async_session_factory() as session:
            result = await session.execute(
                select(User).where(User.user_id == DEFAULT_USER_ID)
            )
            if result.scalar_one_or_none() is None:
                default_user = User(
                    user_id=DEFAULT_USER_ID,
                    user_name="Default User",
                )
                session.add(default_user)
                await session.commit()
    yield


app = FastAPI(title="Mathgirl API", version="0.2.0", lifespan=lifespan)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(chat_ws_router)
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(speakers_router, prefix="/api", tags=["speakers"])
app.include_router(synthesis_router, prefix="/api", tags=["synthesis"])
app.include_router(turntaking_ws_router)
app.include_router(sessions_router, prefix="/api", tags=["sessions"])
app.include_router(notes_router, prefix="/api", tags=["notes"])
app.include_router(ocr_router, prefix="/api", tags=["ocr"])
app.include_router(materials_router, prefix="/api", tags=["materials"])


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Mathgirl API!"}

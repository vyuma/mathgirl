# FastAPIプロジェクトのメインアプリケーションファイル
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from router.speak_chat import chat_ws_router, chat_router, speakers_router, synthesis_router, aizuchi_router, turntaking_ws_router

app = FastAPI(title="Mathgirl API", version="0.1.0")

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
app.include_router(aizuchi_router, prefix="/api", tags=["aizuchi"])
app.include_router(turntaking_ws_router)


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Mathgirl API!"}


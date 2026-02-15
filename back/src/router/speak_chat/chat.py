from fastapi import APIRouter
from pydantic import BaseModel

from model.speak_chat.chat import ChatMessage
from agent.original_chat import AliceAgent

router = APIRouter()


class ChatRequestBody(BaseModel):
    """REST API用のチャットリクエスト"""
    messages: list[ChatMessage]
    goal: str | None = None


class ChatResponseBody(BaseModel):
    """REST API用のチャットレスポンス"""
    content: str


@router.post("/chat", response_model=ChatResponseBody)
async def chat(request: ChatRequestBody):
    """
    チャットAPI（非ストリーミング）

    WebSocket非対応時のフォールバック用
    """
    agent = AliceAgent()
    response = await agent.generate(request.messages, request.goal)
    return ChatResponseBody(content=response)

from typing import Literal
from pydantic import BaseModel


class ChatMessage(BaseModel):
    """チャットメッセージ"""
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """WebSocket経由のチャットリクエスト"""
    type: Literal["chat_request"]
    messages: list[ChatMessage]
    goal: str | None = None
    speaker_uuid: str
    style_id: int = 0


class TextChunk(BaseModel):
    """テキストチャンク（文単位）"""
    type: Literal["text_chunk"] = "text_chunk"
    index: int
    text: str
    is_partial: bool = False


class AudioChunk(BaseModel):
    """音声チャンク（Base64エンコード）"""
    type: Literal["audio_chunk"] = "audio_chunk"
    index: int
    audio_base64: str


class CompleteMessage(BaseModel):
    """完了メッセージ"""
    type: Literal["complete"] = "complete"
    full_text: str


class ErrorMessage(BaseModel):
    """エラーメッセージ"""
    type: Literal["error"] = "error"
    message: str


# Union type for all WebSocket messages
WSMessage = TextChunk | AudioChunk | CompleteMessage | ErrorMessage

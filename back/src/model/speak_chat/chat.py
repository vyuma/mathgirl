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
    session_id: str | None = None


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


class BlackboardUpdate(BaseModel):
    """黒板更新メッセージ"""
    type: Literal["blackboard_update"] = "blackboard_update"
    latex: str
    explanation: str


class SuggestOperation(BaseModel):
    """式操作提案メッセージ"""
    type: Literal["suggest_operation"] = "suggest_operation"
    latex: str
    operation: str
    explanation: str


class HintMessage(BaseModel):
    """ヒントメッセージ"""
    type: Literal["hint"] = "hint"
    hint_text: str
    related_latex: str | None = None


# Union type for all WebSocket messages
WSMessage = TextChunk | AudioChunk | CompleteMessage | ErrorMessage | BlackboardUpdate | SuggestOperation | HintMessage

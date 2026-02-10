import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from model.speak_chat.chat import ChatRequest, ChatMessage, ErrorMessage, CompleteMessage
from service.tts import StreamingTTS
from db.engine import async_session_factory
from db.repositories import MessageRepository

router = APIRouter()


async def _save_message(session_id_str: str | None, role: str, content: str, content_type: str = "text", metadata: dict | None = None):
    """セッションIDがある場合、メッセージをDBに保存"""
    if not session_id_str:
        return
    try:
        session_id = uuid.UUID(session_id_str)
        async with async_session_factory() as db:
            repo = MessageRepository(db)
            await repo.create(
                session_id=session_id,
                role=role,
                content=content,
                content_type=content_type,
                metadata=metadata,
            )
            await db.commit()
    except Exception as e:
        print(f"Failed to save message: {e}")


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    チャット用WebSocketエンドポイント

    クライアントからのチャットリクエストを受け取り、
    テキストと音声をストリーミングで返す
    """
    await websocket.accept()

    streaming_tts = StreamingTTS()

    try:
        while True:
            # クライアントからのメッセージを待機
            raw_data = await websocket.receive_text()

            try:
                data = json.loads(raw_data)

                # chat_request タイプのみ処理
                if data.get("type") != "chat_request":
                    error = ErrorMessage(message="Unknown message type")
                    await websocket.send_text(error.model_dump_json())
                    continue

                # リクエストをパース
                request = ChatRequest(
                    type="chat_request",
                    messages=[ChatMessage(**m) for m in data.get("messages", [])],
                    goal=data.get("goal"),
                    speaker_uuid=data["speaker_uuid"],
                    style_id=data.get("style_id", 0),
                    session_id=data.get("session_id"),
                )

                # ユーザーの最新メッセージをDBに保存
                if request.messages:
                    last_user_msg = next(
                        (m for m in reversed(request.messages) if m.role == "user"),
                        None,
                    )
                    if last_user_msg:
                        await _save_message(
                            request.session_id, "user", last_user_msg.content
                        )

                # ストリーミング応答を送信
                async for message in streaming_tts.stream_chat_with_audio(
                    messages=request.messages,
                    goal=request.goal,
                    speaker_uuid=request.speaker_uuid,
                    style_id=request.style_id,
                ):
                    await websocket.send_text(message.model_dump_json())

                    # 完了メッセージでアシスタント応答をDBに保存
                    if isinstance(message, CompleteMessage):
                        await _save_message(
                            request.session_id, "assistant", message.full_text
                        )

            except json.JSONDecodeError:
                error = ErrorMessage(message="Invalid JSON")
                await websocket.send_text(error.model_dump_json())
            except KeyError as e:
                error = ErrorMessage(message=f"Missing required field: {e}")
                await websocket.send_text(error.model_dump_json())
            except Exception as e:
                error = ErrorMessage(message=f"Error: {str(e)}")
                await websocket.send_text(error.model_dump_json())

    except WebSocketDisconnect:
        pass
    finally:
        await streaming_tts.close()

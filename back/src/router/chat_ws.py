import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from model.chat import ChatRequest, ChatMessage, ErrorMessage
from service.tts import StreamingTTS

router = APIRouter()


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
                )

                # ストリーミング応答を送信
                async for message in streaming_tts.stream_chat_with_audio(
                    messages=request.messages,
                    goal=request.goal,
                    speaker_uuid=request.speaker_uuid,
                    style_id=request.style_id,
                ):
                    await websocket.send_text(message.model_dump_json())

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

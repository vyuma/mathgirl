import asyncio
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from auth.dependencies import verify_ws_token
from model.speak_chat.chat import (
    ChatRequest, ChatMessage, ErrorMessage, CompleteMessage,
    AnimationStarted, AnimationProgress, AnimationComplete, AnimationFailed,
)
from service.tts import StreamingTTS
from service.animation import AnimationClient
from agent.session_chat import SessionAgent
from db.engine import async_session_factory
from db.repositories import MessageRepository, SessionRepository

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


async def _send_ws_message(websocket: WebSocket, ws_lock: asyncio.Lock, message: BaseModel):
    """WebSocket送信をロック付きで行う。"""
    async with ws_lock:
        await websocket.send_text(message.model_dump_json())


async def _poll_animation_job(
    websocket: WebSocket,
    ws_lock: asyncio.Lock,
    animation_client: AnimationClient,
    job_id: str,
    generation_id: int,
):
    """バックグラウンドでアニメーションジョブをポーリングし、進捗/完了/失敗をWebSocket送信"""
    try:
        while True:
            await asyncio.sleep(2)
            status_data = await animation_client.get_job_status(job_id)
            status = status_data.get("status", "")

            if status == "completed":
                result = status_data.get("result", {})
                video_id = result.get("video_id", "")
                video_url = animation_client.get_video_url(video_id)
                msg = AnimationComplete(
                    job_id=job_id,
                    generation_id=generation_id,
                    video_id=video_id,
                    video_url=video_url,
                )
                await _send_ws_message(websocket, ws_lock, msg)
                return

            if status in ("failed", "error"):
                error_msg = status_data.get("error", "Unknown error")
                msg = AnimationFailed(job_id=job_id, error=error_msg)
                await _send_ws_message(websocket, ws_lock, msg)
                return

            # In progress
            progress = status_data.get("progress", 0)
            current_step = status_data.get("current_step", "")
            msg = AnimationProgress(
                job_id=job_id,
                progress=progress,
                current_step=current_step,
            )
            await _send_ws_message(websocket, ws_lock, msg)
    except Exception as e:
        try:
            msg = AnimationFailed(job_id=job_id, error=str(e))
            await _send_ws_message(websocket, ws_lock, msg)
        except Exception:
            pass


async def _handle_animation_requests(
    websocket: WebSocket,
    ws_lock: asyncio.Lock,
    animation_client: AnimationClient,
    requests: list[dict],
    bg_tasks: set[asyncio.Task],
):
    """アニメーションリクエストを処理し、バックグラウンドポーリングを開始"""
    for req in requests:
        try:
            if req["type"] == "animation_request":
                # Plan -> Full job
                plan_data = await animation_client.plan_animation(
                    req["text"], req.get("additional_instructions", "")
                )
                generation_id = plan_data["generation_id"]
                job_data = await animation_client.create_full_job(
                    req["text"], req.get("additional_instructions", "")
                )
                job_id = job_data["job_id"]
                description = req["text"]

            elif req["type"] == "animation_edit_request":
                # Edit job
                generation_id = req["generation_id"]
                job_data = await animation_client.create_edit_job(
                    generation_id=req["generation_id"],
                    prior_video_id=req["prior_video_id"],
                    enhance_prompt=req["enhance_prompt"],
                )
                job_id = job_data["job_id"]
                description = req["enhance_prompt"]
            else:
                continue

            # Send AnimationStarted
            started_msg = AnimationStarted(
                generation_id=generation_id,
                job_id=job_id,
                description=description,
            )
            await _send_ws_message(websocket, ws_lock, started_msg)

            # Start background polling
            task = asyncio.create_task(
                _poll_animation_job(websocket, ws_lock, animation_client, job_id, generation_id)
            )
            bg_tasks.add(task)
            task.add_done_callback(bg_tasks.discard)

        except Exception as e:
            error_job_id = f"animation_error_{uuid.uuid4().hex[:8]}"
            error_msg = AnimationFailed(job_id=error_job_id, error=str(e))
            await _send_ws_message(websocket, ws_lock, error_msg)


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    チャット用WebSocketエンドポイント

    クライアントからのチャットリクエストを受け取り、
    テキストと音声をストリーミングで返す
    """
    # Authenticate before accepting
    token = websocket.query_params.get("token")
    async with async_session_factory() as db:
        user = await verify_ws_token(token, db)
        await db.commit()

    if user is None:
        await websocket.close(code=4001, reason="Authentication required")
        return

    user_id = user.user_id
    await websocket.accept()

    streaming_tts = StreamingTTS(agent=SessionAgent())
    animation_client = AnimationClient()
    ws_lock = asyncio.Lock()
    bg_tasks: set[asyncio.Task] = set()

    try:
        while True:
            # クライアントからのメッセージを待機
            raw_data = await websocket.receive_text()

            try:
                data = json.loads(raw_data)

                # chat_request タイプのみ処理
                if data.get("type") != "chat_request":
                    error = ErrorMessage(message="Unknown message type")
                    await _send_ws_message(websocket, ws_lock, error)
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

                # session_id 所有者チェック
                if request.session_id:
                    try:
                        async with async_session_factory() as db:
                            session_repo = SessionRepository(db)
                            session_obj = await session_repo.get_by_id(
                                uuid.UUID(request.session_id)
                            )
                            if session_obj and session_obj.user_id != user_id:
                                error = ErrorMessage(message="Forbidden: not your session")
                                await _send_ws_message(websocket, ws_lock, error)
                                continue
                    except Exception as e:
                        print(f"Failed to verify session ownership: {e}")

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

                # session_idがある場合、DBからtext_contentを取得
                text_content = None
                if request.session_id:
                    try:
                        async with async_session_factory() as db:
                            session_repo = SessionRepository(db)
                            session_obj = await session_repo.get_by_id(
                                uuid.UUID(request.session_id)
                            )
                            if session_obj:
                                text_content = session_obj.text_content
                    except Exception as e:
                        print(f"Failed to fetch session text_content: {e}")

                # ストリーミング応答を送信
                async for message in streaming_tts.stream_chat_with_audio(
                    messages=request.messages,
                    goal=request.goal,
                    speaker_uuid=request.speaker_uuid,
                    style_id=request.style_id,
                    text_content=text_content,
                ):
                    await _send_ws_message(websocket, ws_lock, message)

                    # 完了メッセージでアシスタント応答をDBに保存
                    if isinstance(message, CompleteMessage):
                        await _save_message(
                            request.session_id, "assistant", message.full_text
                        )

                # アニメーションリクエストをバックグラウンドで処理
                anim_requests = streaming_tts.get_pending_animation_requests()
                if anim_requests:
                    await _handle_animation_requests(
                        websocket, ws_lock, animation_client, anim_requests, bg_tasks
                    )

            except json.JSONDecodeError:
                error = ErrorMessage(message="Invalid JSON")
                await _send_ws_message(websocket, ws_lock, error)
            except KeyError as e:
                error = ErrorMessage(message=f"Missing required field: {e}")
                await _send_ws_message(websocket, ws_lock, error)
            except Exception as e:
                error = ErrorMessage(message=f"Error: {str(e)}")
                await _send_ws_message(websocket, ws_lock, error)

    except WebSocketDisconnect:
        pass
    finally:
        for task in bg_tasks:
            task.cancel()
        await streaming_tts.close()
        await animation_client.close()

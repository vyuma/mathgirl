import asyncio
import base64
from typing import AsyncGenerator

from model.speak_chat.chat import (
    ChatMessage, TextChunk, AudioChunk, CompleteMessage, WSMessage,
    BlackboardUpdate, SuggestOperation, HintMessage,
    SocraticQuestion, UnderstandingUpdate, EmotionUpdate,
)
from agent.original_chat import AliceAgent
from .coeiroink_client import CoeiroinkClient


class StreamingTTS:
    """
    ストリーミングTTSオーケストレーター

    LLMからの文単位出力を受け取り、並列でTTS処理を行い、
    順序を保証しながらテキストと音声を配信する
    """

    def __init__(
        self,
        agent=None,
        tts_client: CoeiroinkClient | None = None,
    ):
        self.agent = agent or AliceAgent()
        self.tts_client = tts_client or CoeiroinkClient()
        self._pending_animation_requests: list[dict] = []
        self._pending_slide_requests: list[dict] = []

    @staticmethod
    def _tool_result_to_message(result: dict) -> WSMessage | None:
        """Convert a tool result dict to a WSMessage."""
        msg_type = result.get("type")
        if msg_type == "blackboard_update":
            return BlackboardUpdate(
                latex=result["latex"],
                explanation=result["explanation"],
            )
        if msg_type == "suggest_operation":
            return SuggestOperation(
                latex=result["latex"],
                operation=result["operation"],
                explanation=result["explanation"],
            )
        if msg_type == "hint":
            return HintMessage(
                hint_text=result["hint_text"],
                related_latex=result.get("related_latex"),
            )
        if msg_type == "socratic_question":
            return SocraticQuestion(
                question_text=result["question_text"],
                question_if_correct=result["question_if_correct"],
                question_if_stuck=result["question_if_stuck"],
                visual_hint_latex=result.get("visual_hint_latex"),
                current_understanding_level=result.get("current_understanding_level", 0),
            )
        if msg_type == "understanding_update":
            return UnderstandingUpdate(
                level=result["level"],
                reasoning=result["reasoning"],
                topic=result["topic"],
            )
        if msg_type == "emotion_update":
            return EmotionUpdate(
                emotion=result["emotion"],
                intensity=result["intensity"],
                reason=result["reason"],
            )
        return None

    async def stream_chat_with_audio(
        self,
        messages: list[ChatMessage],
        goal: str | None = None,
        speaker_uuid: str = "",
        style_id: int = 0,
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> AsyncGenerator[WSMessage, None]:
        """
        チャット応答と音声をストリーミング配信

        SessionAgent の場合:
          1. invoke() でLLM呼び出し＋ツール処理
          2. ツール結果（黒板・質問等）を先に送信
          3. speak テキストを音声ストリーミング
        """
        from agent.session_chat import SessionAgent

        # --- SessionAgent / V2Agent: ReActストリーミング + キュー方式音声配信 ---
        #
        # 処理フロー:
        #   stream_react() が speak を yield するたびに:
        #     1. TextChunk を即送信
        #     2. TTS HTTPストリームをキューに流すタスクを並列起動
        #   他のツール結果（黒板・感情等）はその都度 WebSocket へ送信
        #   ループの各イテレーション後に完成済み音声キューを早期フラッシュ
        #   ループ終了後に残りのキューを順番に drain して AudioChunk を送信
        _v2_types: tuple = (SessionAgent,)
        try:
            from agent.v2 import V2Agent
            _v2_types = (SessionAgent, V2Agent)
        except ImportError:
            pass
        if isinstance(self.agent, _v2_types):
            self._pending_animation_requests.clear()
            self._pending_slide_requests.clear()
            speak_texts: list[str] = []
            # index → asyncio.Queue[bytes | None]
            tts_queues: list[asyncio.Queue] = []
            speak_index = 0
            next_audio_index = 0

            async def _flush_ready_queues():
                """完成済みキューを順番に drain して AudioChunk を yield する。
                先頭キューが未完成なら即座に返る（順序保証）。"""
                nonlocal next_audio_index
                while next_audio_index < speak_index:
                    if next_audio_index >= len(tts_queues):
                        break
                    q = tts_queues[next_audio_index]
                    drained = False
                    try:
                        while True:
                            chunk: bytes | None = q.get_nowait()
                            if chunk is None:
                                # このインデックスのストリーム完了
                                yield AudioChunk(
                                    index=next_audio_index,
                                    audio_base64="",
                                    is_final=True,
                                )
                                next_audio_index += 1
                                drained = True
                                break
                            yield AudioChunk(
                                index=next_audio_index,
                                audio_base64=base64.b64encode(chunk).decode(),
                                is_final=False,
                            )
                    except asyncio.QueueEmpty:
                        break  # まだ届いていない
                    if not drained:
                        break  # 先頭キューが未完成なので後続も待つ

            async for result in self.agent.stream_react(
                messages, text_content=text_content, meta_info=meta_info
            ):
                r_type = result.get("type")

                if r_type == "speak":
                    text = result["text"]
                    speak_texts.append(text)
                    # テキストを即送信
                    yield TextChunk(index=speak_index, text=text, is_partial=False)
                    if speaker_uuid:
                        q: asyncio.Queue = asyncio.Queue()
                        tts_queues.append(q)
                        asyncio.create_task(
                            self._fill_tts_queue(q, text, speaker_uuid, style_id)
                        )
                    else:
                        # 音声なし: センチネルを即投入してキューをすぐ完了扱いにする
                        q_empty: asyncio.Queue = asyncio.Queue()
                        q_empty.put_nowait(None)
                        tts_queues.append(q_empty)
                    speak_index += 1

                elif r_type in ("animation_request", "animation_edit_request"):
                    self._pending_animation_requests.append(result)

                elif r_type == "slide_request":
                    self._pending_slide_requests.append(result)

                else:
                    msg = self._tool_result_to_message(result)
                    if msg:
                        yield msg

                # 他ツール結果処理中に完成済み音声があれば早期配信
                async for audio_msg in _flush_ready_queues():
                    yield audio_msg

            # ループ後: 残りのキューを順番に drain（未完成のものは await で待機）
            while next_audio_index < speak_index:
                if next_audio_index >= len(tts_queues):
                    break
                q = tts_queues[next_audio_index]
                while True:
                    chunk: bytes | None = await q.get()
                    if chunk is None:
                        yield AudioChunk(
                            index=next_audio_index,
                            audio_base64="",
                            is_final=True,
                        )
                        next_audio_index += 1
                        break
                    yield AudioChunk(
                        index=next_audio_index,
                        audio_base64=base64.b64encode(chunk).decode(),
                        is_final=False,
                    )

            yield CompleteMessage(full_text="".join(speak_texts))
            return

        # --- AliceAgent等: 従来のストリーミング ---
        sentence_gen = self.agent.stream_sentences(messages, goal)

        tts_tasks_old: dict[int, asyncio.Task[bytes]] = {}
        full_text_parts: list[str] = []
        next_audio_index = 0

        async for index, text, is_partial in sentence_gen:
            full_text_parts.append(text)

            yield TextChunk(index=index, text=text, is_partial=is_partial)

            if speaker_uuid:
                tts_task = asyncio.create_task(
                    self._synthesize_audio(text, speaker_uuid, style_id)
                )
                tts_tasks_old[index] = tts_task

            while next_audio_index in tts_tasks_old:
                task = tts_tasks_old[next_audio_index]
                if task.done():
                    try:
                        audio_data = task.result()
                        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                        yield AudioChunk(index=next_audio_index, audio_base64=audio_base64)
                    except Exception as e:
                        print(f"TTS failed for index {next_audio_index}: {e}")
                    del tts_tasks_old[next_audio_index]
                    next_audio_index += 1
                else:
                    break

        while tts_tasks_old:
            if next_audio_index in tts_tasks_old:
                task = tts_tasks_old[next_audio_index]
                try:
                    audio_data = await task
                    audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                    yield AudioChunk(index=next_audio_index, audio_base64=audio_base64)
                except Exception as e:
                    print(f"TTS failed for index {next_audio_index}: {e}")
                del tts_tasks_old[next_audio_index]
                next_audio_index += 1
            else:
                await asyncio.sleep(0.01)

        yield CompleteMessage(full_text="".join(full_text_parts))

    async def _fill_tts_queue(
        self,
        queue: asyncio.Queue,
        text: str,
        speaker_uuid: str,
        style_id: int,
    ) -> None:
        """TTS音声チャンクをキューに流す。完了時は None をセンチネルとして追加する。"""
        try:
            async for chunk in self.tts_client.synthesize_stream(text, speaker_uuid, style_id):
                await queue.put(chunk)
        except Exception as e:
            print(f"TTS stream error: {e}")
        finally:
            await queue.put(None)  # 終了マーカー

    async def _synthesize_audio(
        self, text: str, speaker_uuid: str, style_id: int
    ) -> bytes:
        """音声合成を実行（AliceAgent用）"""
        return await self.tts_client.synthesize(
            text=text,
            speaker_uuid=speaker_uuid,
            style_id=style_id,
        )

    def get_pending_animation_requests(self) -> list[dict]:
        """取得して保留中のアニメーションリクエストをクリア"""
        reqs = self._pending_animation_requests.copy()
        self._pending_animation_requests.clear()
        return reqs

    def get_pending_slide_requests(self) -> list[dict]:
        """取得して保留中のスライドリクエストをクリア"""
        reqs = self._pending_slide_requests.copy()
        self._pending_slide_requests.clear()
        return reqs

    async def close(self):
        """リソースをクリーンアップ"""
        await self.tts_client.close()

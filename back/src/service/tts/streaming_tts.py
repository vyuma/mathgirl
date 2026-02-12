import asyncio
import base64
from typing import AsyncGenerator

from model.speak_chat.chat import (
    ChatMessage, TextChunk, AudioChunk, CompleteMessage, WSMessage,
    BlackboardUpdate, SuggestOperation, HintMessage,
    SocraticQuestion, UnderstandingUpdate,
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

        テキストチャンクは即座に送信し、音声は並列処理後に順序保証で送信
        """
        # TTS処理用のタスクキュー
        tts_tasks: dict[int, asyncio.Task[bytes]] = {}
        full_text_parts: list[str] = []
        next_audio_index = 0

        # SessionAgent の場合は text_content/meta_info を渡す
        from agent.session_chat import SessionAgent
        if isinstance(self.agent, SessionAgent):
            sentence_gen = self.agent.stream_sentences(messages, text_content=text_content, meta_info=meta_info)
        else:
            sentence_gen = self.agent.stream_sentences(messages, goal)

        # LLMからの文単位ストリーミングを処理
        async for index, text, is_partial in sentence_gen:
            full_text_parts.append(text)

            # テキストチャンクを即座に送信
            yield TextChunk(index=index, text=text, is_partial=is_partial)

            # TTS処理を非同期で開始
            if speaker_uuid:
                tts_task = asyncio.create_task(
                    self._synthesize_audio(text, speaker_uuid, style_id)
                )
                tts_tasks[index] = tts_task

            # 完了したTTS結果があれば順序通りに送信
            while next_audio_index in tts_tasks:
                task = tts_tasks[next_audio_index]
                if task.done():
                    try:
                        audio_data = task.result()
                        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                        yield AudioChunk(index=next_audio_index, audio_base64=audio_base64)
                    except Exception as e:
                        print(f"TTS failed for index {next_audio_index}: {e}")

                    del tts_tasks[next_audio_index]
                    next_audio_index += 1
                else:
                    break

        # 残りのTTS結果を順序通りに送信
        while tts_tasks:
            if next_audio_index in tts_tasks:
                task = tts_tasks[next_audio_index]
                try:
                    audio_data = await task
                    audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                    yield AudioChunk(index=next_audio_index, audio_base64=audio_base64)
                except Exception as e:
                    print(f"TTS failed for index {next_audio_index}: {e}")

                del tts_tasks[next_audio_index]
                next_audio_index += 1
            else:
                await asyncio.sleep(0.01)

        # ツール結果をWSメッセージとして送信（SessionAgentの場合）
        if isinstance(self.agent, SessionAgent):
            tool_results = self.agent.get_tool_results()
            for result in tool_results:
                msg_type = result.get("type")
                if msg_type == "blackboard_update":
                    yield BlackboardUpdate(
                        latex=result["latex"],
                        explanation=result["explanation"],
                    )
                elif msg_type == "suggest_operation":
                    yield SuggestOperation(
                        latex=result["latex"],
                        operation=result["operation"],
                        explanation=result["explanation"],
                    )
                elif msg_type == "hint":
                    yield HintMessage(
                        hint_text=result["hint_text"],
                        related_latex=result.get("related_latex"),
                    )
                elif msg_type == "socratic_question":
                    yield SocraticQuestion(
                        question_text=result["question_text"],
                        question_if_correct=result["question_if_correct"],
                        question_if_stuck=result["question_if_stuck"],
                        visual_hint_latex=result.get("visual_hint_latex"),
                        current_understanding_level=result.get("current_understanding_level", 0),
                    )
                elif msg_type == "understanding_update":
                    yield UnderstandingUpdate(
                        level=result["level"],
                        reasoning=result["reasoning"],
                        topic=result["topic"],
                    )

        # 完了メッセージを送信
        full_text = "".join(full_text_parts)
        yield CompleteMessage(full_text=full_text)

    async def _synthesize_audio(
        self, text: str, speaker_uuid: str, style_id: int
    ) -> bytes:
        """音声合成を実行"""
        return await self.tts_client.synthesize(
            text=text,
            speaker_uuid=speaker_uuid,
            style_id=style_id,
        )

    async def close(self):
        """リソースをクリーンアップ"""
        await self.tts_client.close()

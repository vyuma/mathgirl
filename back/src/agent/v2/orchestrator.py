"""V2Agent: orchestrates MetaAgent + MainAgent with the same interface as SessionAgent."""
import uuid
from typing import AsyncGenerator

from model.speak_chat.chat import ChatMessage
from service.redis.session_state import SessionStateManager
from .meta_agent import MetaAgent
from .main_agent import MainAgent


class V2Agent:
    """Drop-in replacement for SessionAgent with MetaAgent/MainAgent separation."""

    def __init__(
        self,
        state_manager: SessionStateManager,
        model_name: str = "gemini-3.1-flash-lite-preview",
    ):
        self._state_manager = state_manager
        self._meta_agent = MetaAgent(model_name=model_name)
        self._main_agent = MainAgent(model_name=model_name)
        self._session_id: str = str(uuid.uuid4())

    def set_session_id(self, session_id: str) -> None:
        self._session_id = session_id

    async def stream_react(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,  # kept for v1 interface compatibility, unused
    ) -> AsyncGenerator[dict, None]:
        """Orchestrate MetaAgent → side effects → MainAgent stream.

        Yields side effects (EmotionUpdate/UnderstandingUpdate) first,
        then MainAgent content (speak, blackboard, etc.).
        """
        meta_context, side_effects = await self._meta_agent.analyze_and_update(
            session_id=self._session_id,
            messages=messages,
            state_manager=self._state_manager,
        )

        for effect in side_effects:
            yield effect

        async for result in self._main_agent.stream_react_main(
            messages=messages,
            text_content=text_content,
            meta_context=meta_context,
        ):
            yield result

"""MetaAgent: analyzes learner state and decides teaching strategy."""
import json
import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from model.speak_chat.chat import ChatMessage
from service.redis.session_state import SessionStateManager
from .types import MetaState, MetaContext
from .prompts import META_AGENT_PROMPT

_RECENT_MESSAGE_LIMIT = 10


def _build_conversation_history(messages: list[ChatMessage]) -> str:
    recent = messages[-_RECENT_MESSAGE_LIMIT:]
    lines = []
    for msg in recent:
        role = "学習者" if msg.role == "user" else "みくる"
        lines.append(f"{role}: {msg.content}")
    return "\n".join(lines) if lines else "（会話なし）"


class MetaAgent:
    """Lightweight agent that reads/writes Redis state and returns MetaContext + side effects."""

    def __init__(self, model_name: str = "gemini-2.5-flash-lite"):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        self._llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.2,
        )

    async def analyze_and_update(
        self,
        session_id: str,
        messages: list[ChatMessage],
        state_manager: SessionStateManager,
    ) -> tuple[MetaContext, list[dict]]:
        """Analyze conversation, update MetaState in Redis, return (MetaContext, side_effects).

        side_effects contains EmotionUpdate and/or UnderstandingUpdate dicts
        that should be yielded before MainAgent output.
        """
        current_state = await state_manager.get_meta_state(session_id)

        prompt = META_AGENT_PROMPT.format(
            current_state=current_state.model_dump_json(indent=2),
            conversation_history=_build_conversation_history(messages),
        )

        response = await self._llm.ainvoke([HumanMessage(content=prompt)])
        raw = str(response.content).strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: keep current state unchanged
            data = {}

        # Build new MetaState
        stuck_delta = int(data.get("stuck_count_delta", 0))
        new_stuck = max(0, current_state.stuck_count + stuck_delta)

        new_state = MetaState(
            understanding_level=int(data.get("understanding_level", current_state.understanding_level)),
            emotion=data.get("emotion", current_state.emotion),
            emotion_intensity=float(data.get("emotion_intensity", current_state.emotion_intensity)),
            strategy=data.get("strategy", current_state.strategy),
            turn_count=current_state.turn_count + 1,
            stuck_count=new_stuck,
            last_topic=data.get("last_topic", current_state.last_topic),
        )

        await state_manager.save_meta_state(session_id, new_state)

        strategy_instruction = data.get("strategy_instruction", "ソクラテス式で問いかけてください。")
        meta_context = MetaContext(state=new_state, strategy_instruction=strategy_instruction)

        # Build side effects for changed fields
        side_effects: list[dict] = []

        if (new_state.emotion != current_state.emotion
                or abs(new_state.emotion_intensity - current_state.emotion_intensity) > 0.05):
            side_effects.append({
                "type": "emotion_update",
                "emotion": new_state.emotion,
                "intensity": new_state.emotion_intensity,
                "reason": f"MetaAgent推定: {new_state.strategy}戦略, turn={new_state.turn_count}",
            })

        if new_state.understanding_level != current_state.understanding_level:
            side_effects.append({
                "type": "understanding_update",
                "level": new_state.understanding_level,
                "reasoning": f"MetaAgent推定: turn={new_state.turn_count}",
                "topic": new_state.last_topic,
            })

        return meta_context, side_effects

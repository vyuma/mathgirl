"""Redis-backed session state manager for MetaAgent."""
import json
import os
from typing import Optional

import redis.asyncio as aioredis

from agent.v2.types import MetaState

_SESSION_TTL = 7 * 24 * 60 * 60  # 7 days in seconds


class SessionStateManager:
    """Manages MetaState persistence in Redis using Hash data structures.

    Key pattern: session:{session_id}:meta
    """

    def __init__(self, redis_url: str):
        self._client: aioredis.Redis = aioredis.from_url(redis_url, decode_responses=True)

    def _key(self, session_id: str) -> str:
        return f"session:{session_id}:meta"

    async def get_meta_state(self, session_id: str) -> MetaState:
        """Load MetaState from Redis. Returns default if not found."""
        key = self._key(session_id)
        data = await self._client.hgetall(key)
        if not data:
            return MetaState()
        return MetaState(
            understanding_level=int(data.get("understanding_level", 0)),
            emotion=data.get("emotion", "neutral"),
            emotion_intensity=float(data.get("emotion_intensity", 0.5)),
            strategy=data.get("strategy", "socratic"),
            turn_count=int(data.get("turn_count", 0)),
            stuck_count=int(data.get("stuck_count", 0)),
            last_topic=data.get("last_topic", ""),
        )

    async def save_meta_state(self, session_id: str, state: MetaState) -> None:
        """Persist MetaState to Redis with TTL refresh."""
        key = self._key(session_id)
        mapping = {
            "understanding_level": str(state.understanding_level),
            "emotion": state.emotion,
            "emotion_intensity": str(state.emotion_intensity),
            "strategy": state.strategy,
            "turn_count": str(state.turn_count),
            "stuck_count": str(state.stuck_count),
            "last_topic": state.last_topic,
        }
        await self._client.hset(key, mapping=mapping)
        await self._client.expire(key, _SESSION_TTL)

    async def close(self) -> None:
        await self._client.aclose()


_state_manager: Optional[SessionStateManager] = None


def get_state_manager() -> SessionStateManager:
    """Return the singleton SessionStateManager, creating it from REDIS_URL env if needed."""
    global _state_manager
    if _state_manager is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _state_manager = SessionStateManager(redis_url)
    return _state_manager

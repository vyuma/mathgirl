"""Type definitions for V2 agent."""
from typing import Literal

from pydantic import BaseModel

EmotionType = Literal["joy", "thinking", "confused", "encouraging", "neutral"]
StrategyType = Literal["socratic", "scaffolding", "direct", "encouraging", "challenge"]


class MetaState(BaseModel):
    understanding_level: int = 0       # 0-5
    emotion: EmotionType = "neutral"
    emotion_intensity: float = 0.5
    strategy: StrategyType = "socratic"
    turn_count: int = 0
    stuck_count: int = 0               # consecutive stuck turns
    last_topic: str = ""


class MetaContext(BaseModel):
    state: MetaState
    strategy_instruction: str          # concrete instruction passed to MainAgent

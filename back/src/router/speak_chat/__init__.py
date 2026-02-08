from .chat_ws import router as chat_ws_router
from .chat import router as chat_router
from .speakers import router as speakers_router
from .synthesis import router as synthesis_router
from .turntaking_ws import router as turntaking_ws_router

__all__ = ["chat_ws_router", "chat_router", "speakers_router", "synthesis_router", "aizuchi_router", "turntaking_ws_router"]
    
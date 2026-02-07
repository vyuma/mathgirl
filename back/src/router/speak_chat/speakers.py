from fastapi import APIRouter, HTTPException

from model.speak_chat.speaker import Speaker
from service.tts import CoeiroinkClient

router = APIRouter()


@router.get("/speakers", response_model=list[Speaker])
async def get_speakers():
    """
    COEIROINK スピーカー一覧を取得

    Returns:
        利用可能なスピーカーのリスト
    """
    client = CoeiroinkClient()

    try:
        speakers = await client.get_speakers()
        return speakers
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"COEIROINK not available: {e}")
    finally:
        await client.close()

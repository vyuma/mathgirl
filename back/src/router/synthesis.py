import os
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from service.tts import CoeiroinkClient

router = APIRouter()
logger = logging.getLogger(__name__)


class SynthesisRequest(BaseModel):
    """音声合成リクエスト"""
    text: str
    speaker_uuid: str
    style_id: int = 0


@router.post("/synthesis")
async def synthesize(request: SynthesisRequest):
    """
    音声合成API

    COEIROINKを使用してテキストを音声に変換
    """
    coeiroink_url = os.getenv("COEIROINK_API_URL")
    logger.info(f"Using COEIROINK_API_URL: {coeiroink_url}")

    client = CoeiroinkClient()

    try:
        audio_data = await client.synthesize(
            text=request.text,
            speaker_uuid=request.speaker_uuid,
            style_id=request.style_id,
        )
        return Response(content=audio_data, media_type="audio/wav")
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()

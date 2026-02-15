import logging

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.models import User
from model.session import OCRRequest, OCRResponse
from service.ocr import OcrService

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_BASE64_SIZE = 14 * 1024 * 1024  # 14MB (≈ 10MB実画像)


@router.post("/ocr/image", response_model=OCRResponse)
async def ocr_image(
    body: OCRRequest,
    user: User = Depends(get_current_user),
):
    if body.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported mime type: {body.mime_type}. Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    if len(body.image_base64) > MAX_BASE64_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image too large. Maximum size is approximately 10MB.",
        )

    try:
        service = OcrService()
        markdown = await service.extract(body.image_base64, body.mime_type)
        return OCRResponse(markdown=markdown, success=True, error=None)
    except Exception as e:
        logger.exception("OCR processing failed")
        return OCRResponse(markdown="", success=False, error=str(e))

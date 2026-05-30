from pydantic import BaseModel


class SlideGenerateRequest(BaseModel):
    topic: str
    session_id: str | None = None
    slide_count: int = 8


class SlideGenerateResponse(BaseModel):
    slide_id: str
    html: str
    markdown: str

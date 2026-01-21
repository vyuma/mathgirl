from pydantic import BaseModel


class SpeakerStyle(BaseModel):
    """スピーカーのスタイル"""
    id: int
    name: str


class Speaker(BaseModel):
    """スピーカー情報"""
    speaker_uuid: str
    name: str
    styles: list[SpeakerStyle]
    version: str | None = None

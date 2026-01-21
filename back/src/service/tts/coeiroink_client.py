import os
import httpx
from model.speaker import Speaker, SpeakerStyle


class CoeiroinkClient:
    """COEIROINK APIクライアント"""

    def __init__(self, api_url: str | None = None):
        self.api_url = api_url or os.getenv(
            "COEIROINK_API_URL", "http://host.docker.internal:50032"
        )
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.api_url, timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_speakers(self) -> list[Speaker]:
        """スピーカー一覧を取得"""
        client = await self._get_client()
        response = await client.get("/v1/speakers")
        response.raise_for_status()

        data = response.json()
        speakers = []
        for item in data:
            speaker = Speaker(
                speaker_uuid=item["speakerUuid"],
                name=item["speakerName"],
                styles=[
                    SpeakerStyle(id=s["styleId"], name=s["styleName"])
                    for s in item["styles"]
                ],
                version=item.get("version"),
            )
            speakers.append(speaker)

        return speakers

    async def synthesize(
        self,
        text: str,
        speaker_uuid: str,
        style_id: int = 0,
        speed_scale: float = 1.0,
        volume_scale: float = 1.0,
        pitch_scale: float = 0.0,
        intonation_scale: float = 1.0,
    ) -> bytes:
        """テキストを音声に変換"""
        client = await self._get_client()

        body = {
            "speakerUuid": speaker_uuid,
            "styleId": style_id,
            "text": text,
            "speedScale": speed_scale,
            "volumeScale": volume_scale,
            "pitchScale": pitch_scale,
            "intonationScale": intonation_scale,
            "prePhonemeLength": 0.1,
            "postPhonemeLength": 0.5,
            "outputSamplingRate": 24000,
            "startTrimBuffer": 0.0,
            "endTrimBuffer": 0.0,
            "pauseStartTrimBuffer": 0.0,
            "pauseEndTrimBuffer": 0.0,
        }

        response = await client.post(
            "/v1/synthesis",
            json=body,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        return response.content

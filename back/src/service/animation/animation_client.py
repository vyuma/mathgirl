"""Client for the external Manim animation generation API."""

import os

import httpx


ANIMATION_API_URL = os.getenv(
    "ANIMATION_API_URL", "https://animation-generator.yuma-dev.uk"
)


class AnimationClient:
    """Async client for the animation generation API."""

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or ANIMATION_API_URL).rstrip("/")
        self._client = httpx.AsyncClient(timeout=120.0)

    async def plan_animation(
        self, text: str, additional_instructions: str = ""
    ) -> dict:
        """POST /api/plan_animation -> {plan, generation_id}"""
        resp = await self._client.post(
            f"{self.base_url}/api/plan_animation",
            json={"text": text, "additional_instructions": additional_instructions},
        )
        resp.raise_for_status()
        return resp.json()

    async def create_full_job(
        self, content: str, additional_instructions: str = ""
    ) -> dict:
        """POST /api/job/animation/full (query params) -> {job_id, status}"""
        resp = await self._client.post(
            f"{self.base_url}/api/job/animation/full",
            params={
                "content": content,
                "additional_instructions": additional_instructions,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def get_job_status(self, job_id: str) -> dict:
        """GET /api/job/{job_id}/status -> {status, progress, current_step, result}"""
        resp = await self._client.get(
            f"{self.base_url}/api/job/{job_id}/status",
        )
        resp.raise_for_status()
        return resp.json()

    async def create_edit_job(
        self, generation_id: int, prior_video_id: str, enhance_prompt: str
    ) -> dict:
        """POST /api/job/animation/edit -> {job_id, status}"""
        resp = await self._client.post(
            f"{self.base_url}/api/job/animation/edit",
            json={
                "generation_id": generation_id,
                "prior_video_id": prior_video_id,
                "enhance_prompt": enhance_prompt,
            },
        )
        resp.raise_for_status()
        return resp.json()

    def get_video_url(self, video_id: str) -> str:
        """Build the video download URL."""
        return f"{self.base_url}/api/animation/{video_id}"

    async def close(self):
        await self._client.aclose()

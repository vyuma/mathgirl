"""Google ID token verification."""

import asyncio
import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

_http_request = google_requests.Request()


def _verify_sync(token: str) -> dict:
    return id_token.verify_oauth2_token(
        token, _http_request, audience=GOOGLE_CLIENT_ID
    )


async def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and return the decoded payload.

    Returns dict with keys like 'sub', 'email', 'name', 'picture'.
    Raises ValueError on invalid/expired token.
    """
    return await asyncio.to_thread(_verify_sync, token)

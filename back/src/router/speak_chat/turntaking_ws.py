"""
ターンテイキング予測用WebSocketエンドポイント

クライアントから音声ストリームを受け取り、
リアルタイムでターンテイキング予測を返す。
"""

import json
import base64
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from service.turntaking import TurnTakingPredictor

router = APIRouter()


class AudioChunkMessage(BaseModel):
    """音声チャンクメッセージ"""
    type: str = "audio_chunk"
    audio_base64: str  # Base64エンコードされた16bit PCM
    sample_rate: int = 16000


class PredictionResponse(BaseModel):
    """予測結果レスポンス"""
    type: str = "prediction"
    p_now: float
    p_future: float
    should_take_turn: bool
    confidence: float
    suggested_wait_ms: int


class StatusResponse(BaseModel):
    """ステータスレスポンス"""
    type: str = "status"
    vap_available: bool
    message: str


@router.websocket("/ws/turntaking")
async def turntaking_websocket(websocket: WebSocket):
    """
    ターンテイキング予測用WebSocket

    クライアントから音声チャンクを受け取り、
    リアルタイムで予測結果を返す。

    プロトコル:
    - クライアント → サーバー:
        {"type": "audio_chunk", "audio_base64": "...", "sample_rate": 16000}
        {"type": "reset"}
        {"type": "predict"}

    - サーバー → クライアント:
        {"type": "prediction", "p_now": 0.8, "p_future": 0.2, ...}
        {"type": "status", "vap_available": true, "message": "..."}
    """
    await websocket.accept()

    predictor = TurnTakingPredictor()

    # 初期ステータスを送信
    status = StatusResponse(
        type="status",
        vap_available=predictor.is_available,
        message="VAP model ready" if predictor.is_available else "VAP model unavailable, using fallback"
    )
    await websocket.send_text(status.model_dump_json())

    try:
        while True:
            raw_data = await websocket.receive_text()

            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")

                if msg_type == "audio_chunk":
                    # 音声チャンクを処理
                    audio_base64 = data.get("audio_base64", "")
                    sample_rate = data.get("sample_rate", 16000)

                    if audio_base64:
                        audio_bytes = base64.b64decode(audio_base64)
                        predictor.add_audio_chunk(audio_bytes, sample_rate)

                        # 予測を実行
                        prediction = await predictor.predict()

                        response = PredictionResponse(
                            type="prediction",
                            p_now=prediction.p_now,
                            p_future=prediction.p_future,
                            should_take_turn=prediction.should_take_turn,
                            confidence=prediction.confidence,
                            suggested_wait_ms=prediction.suggested_wait_ms
                        )
                        await websocket.send_text(response.model_dump_json())

                elif msg_type == "predict":
                    # 現在のバッファで予測のみ実行
                    prediction = await predictor.predict()

                    response = PredictionResponse(
                        type="prediction",
                        p_now=prediction.p_now,
                        p_future=prediction.p_future,
                        should_take_turn=prediction.should_take_turn,
                        confidence=prediction.confidence,
                        suggested_wait_ms=prediction.suggested_wait_ms
                    )
                    await websocket.send_text(response.model_dump_json())

                elif msg_type == "reset":
                    # バッファをリセット
                    predictor.reset()
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "message": "Buffer reset"
                    }))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON"
                }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))

    except WebSocketDisconnect:
        pass

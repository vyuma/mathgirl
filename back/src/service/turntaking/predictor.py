"""
ターンテイキング予測サービス

VAP (Voice Activity Projection) モデルを使用して、
ユーザーの発話終了タイミングを予測する。

参考: https://www.ai-shift.co.jp/techblog/6093
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional
import asyncio
from collections import deque

# maaiのインポート（遅延ロード）
_vap_model = None


def _get_vap_model():
    """VAPモデルをシングルトンで取得"""
    global _vap_model
    if _vap_model is None:
        try:
            from maai import VAPModel
            _vap_model = VAPModel()
            print("VAP model loaded successfully")
        except Exception as e:
            print(f"Failed to load VAP model: {e}")
            _vap_model = "unavailable"
    return _vap_model if _vap_model != "unavailable" else None


@dataclass
class TurnTakingPrediction:
    """ターンテイキング予測結果"""
    p_now: float  # 0-600msでの発話終了確率
    p_future: float  # 600-2000msでの発話終了確率
    should_take_turn: bool  # ターンを取るべきか
    confidence: float  # 予測の確信度
    suggested_wait_ms: int  # 推奨待機時間（ミリ秒）


class TurnTakingPredictor:
    """
    ターンテイキング予測クラス

    リアルタイム音声ストリームを処理し、
    ユーザーの発話終了タイミングを予測する。
    """

    # 予測のしきい値
    P_NOW_THRESHOLD = 0.5  # p_nowがこれ以上なら即座にターンを取る
    P_FUTURE_THRESHOLD = 0.3  # p_futureがこれ以上なら相槌を準備

    # サンプリングレート
    SAMPLE_RATE = 16000

    # バッファサイズ（2秒分）
    BUFFER_SIZE = SAMPLE_RATE * 2

    def __init__(self):
        self.model = _get_vap_model()
        self.audio_buffer = deque(maxlen=self.BUFFER_SIZE)
        self._last_prediction: Optional[TurnTakingPrediction] = None

    @property
    def is_available(self) -> bool:
        """VAPモデルが利用可能か"""
        return self.model is not None

    def add_audio_chunk(self, audio_data: bytes, sample_rate: int = 16000) -> None:
        """
        音声チャンクをバッファに追加

        Args:
            audio_data: 16bit PCM音声データ
            sample_rate: サンプリングレート
        """
        # bytesをnumpy配列に変換（16bit signed int -> float32）
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
        audio_array = audio_array / 32768.0  # 正規化

        # リサンプリング（必要な場合）
        if sample_rate != self.SAMPLE_RATE:
            ratio = self.SAMPLE_RATE / sample_rate
            new_length = int(len(audio_array) * ratio)
            audio_array = np.interp(
                np.linspace(0, len(audio_array), new_length),
                np.arange(len(audio_array)),
                audio_array
            )

        # バッファに追加
        self.audio_buffer.extend(audio_array)

    async def predict(self) -> TurnTakingPrediction:
        """
        現在のバッファに基づいてターンテイキングを予測

        Returns:
            TurnTakingPrediction: 予測結果
        """
        if not self.is_available:
            # モデルが利用できない場合はフォールバック
            return self._fallback_prediction()

        if len(self.audio_buffer) < self.SAMPLE_RATE:  # 最低1秒必要
            return TurnTakingPrediction(
                p_now=0.0,
                p_future=0.0,
                should_take_turn=False,
                confidence=0.0,
                suggested_wait_ms=1500
            )

        try:
            # バッファから音声データを取得
            audio_array = np.array(list(self.audio_buffer), dtype=np.float32)

            # ステレオ形式に変換（ユーザー音声 + 無音チャンネル）
            user_audio = audio_array.reshape(1, -1)
            silent_channel = np.zeros_like(user_audio)
            stereo_audio = np.stack([user_audio, silent_channel], axis=0)

            # 非同期でモデル推論
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.model(stereo_audio)
            )

            # 結果を解析
            p_now = float(result.get('p_now', 0.0))
            p_future = float(result.get('p_future', 0.0))

            # ターンを取るべきか判定
            should_take_turn = p_now >= self.P_NOW_THRESHOLD

            # 確信度を計算
            confidence = max(p_now, p_future)

            # 推奨待機時間を計算
            if p_now >= self.P_NOW_THRESHOLD:
                suggested_wait_ms = 250  # すぐにターンを取る
            elif p_future >= self.P_FUTURE_THRESHOLD:
                suggested_wait_ms = 600  # 少し待つ
            else:
                suggested_wait_ms = 1500  # 通常の待機

            prediction = TurnTakingPrediction(
                p_now=p_now,
                p_future=p_future,
                should_take_turn=should_take_turn,
                confidence=confidence,
                suggested_wait_ms=suggested_wait_ms
            )

            self._last_prediction = prediction
            return prediction

        except Exception as e:
            print(f"Turn-taking prediction error: {e}")
            return self._fallback_prediction()

    def _fallback_prediction(self) -> TurnTakingPrediction:
        """フォールバック予測（モデルが利用できない場合）"""
        return TurnTakingPrediction(
            p_now=0.0,
            p_future=0.0,
            should_take_turn=False,
            confidence=0.0,
            suggested_wait_ms=1500  # デフォルト1.5秒
        )

    def reset(self) -> None:
        """バッファをリセット"""
        self.audio_buffer.clear()
        self._last_prediction = None

    @property
    def last_prediction(self) -> Optional[TurnTakingPrediction]:
        """最後の予測結果"""
        return self._last_prediction


# シングルトンインスタンス
_predictor_instance: Optional[TurnTakingPredictor] = None


def get_predictor() -> TurnTakingPredictor:
    """シングルトンプレディクターを取得"""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = TurnTakingPredictor()
    return _predictor_instance

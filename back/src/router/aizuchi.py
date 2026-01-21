import os
import random
from urllib.parse import quote
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from service.tts import CoeiroinkClient

router = APIRouter()

# 相槌用の軽量LLMインスタンス
_aizuchi_llm: ChatGoogleGenerativeAI | None = None

# 定型相槌（LLM不要で即座に返せる）
QUICK_AIZUCHI = [
    "うんうん",
    "へぇ～",
    "なるほど",
    "そうなんだ",
    "ふむふむ",
    "うん",
    "そっか",
]

AIZUCHI_SYSTEM_PROMPT = """相槌を1つだけ出力。例: うんうん、へぇ～、なるほど、そうなんだ、ふむふむ
相槌のみ。説明不要。"""


def _get_aizuchi_llm() -> ChatGoogleGenerativeAI:
    """相槌用LLMを取得"""
    global _aizuchi_llm
    if _aizuchi_llm is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")

        _aizuchi_llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=api_key,
            temperature=0.9,  # バリエーションを出すため高め
            max_output_tokens=50,  # 相槌は短い
        )
    return _aizuchi_llm


class AizuchiRequest(BaseModel):
    """相槌リクエスト"""
    user_text: str  # ユーザーが話している途中のテキスト
    use_llm: bool = False  # LLMを使うか（Falseなら定型から選択）


class AizuchiResponse(BaseModel):
    """相槌レスポンス"""
    text: str


class AizuchiAudioRequest(BaseModel):
    """相槌音声リクエスト"""
    user_text: str
    speaker_uuid: str
    style_id: int = 0
    use_llm: bool = False


@router.post("/aizuchi", response_model=AizuchiResponse)
async def generate_aizuchi(request: AizuchiRequest):
    """
    相槌テキストを生成

    use_llm=False: 定型相槌からランダム選択（高速）
    use_llm=True: LLMで文脈に合った相槌を生成
    """
    if not request.use_llm:
        # 定型相槌からランダム選択（超高速）
        aizuchi = random.choice(QUICK_AIZUCHI)
        return AizuchiResponse(text=aizuchi)

    # LLMで生成
    llm = _get_aizuchi_llm()
    messages = [
        SystemMessage(content=AIZUCHI_SYSTEM_PROMPT),
        HumanMessage(content=f"ユーザー: {request.user_text}"),
    ]

    response = await llm.ainvoke(messages)
    aizuchi = str(response.content).strip()

    # 長すぎる場合は定型に fallback
    if len(aizuchi) > 20:
        aizuchi = random.choice(QUICK_AIZUCHI)

    return AizuchiResponse(text=aizuchi)


@router.post("/aizuchi/audio")
async def generate_aizuchi_audio(request: AizuchiAudioRequest):
    """
    相槌を音声で返す（テキスト生成 + TTS を一括）
    """
    # 相槌テキスト生成
    if not request.use_llm:
        aizuchi = random.choice(QUICK_AIZUCHI)
    else:
        llm = _get_aizuchi_llm()
        messages = [
            SystemMessage(content=AIZUCHI_SYSTEM_PROMPT),
            HumanMessage(content=f"ユーザー: {request.user_text}"),
        ]
        response = await llm.ainvoke(messages)
        aizuchi = str(response.content).strip()
        if len(aizuchi) > 20:
            aizuchi = random.choice(QUICK_AIZUCHI)

    # TTS
    client = CoeiroinkClient()
    try:
        audio_data = await client.synthesize(
            text=aizuchi,
            speaker_uuid=request.speaker_uuid,
            style_id=request.style_id,
        )
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={"X-Aizuchi-Text": quote(aizuchi, encoding='utf-8')},
        )
    finally:
        await client.close()

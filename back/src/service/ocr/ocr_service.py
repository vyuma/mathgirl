"""画像からテキスト・数式を抽出するOCRサービス (Gemini Vision API)"""

import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

OCR_PROMPT = """\
この画像に含まれるテキストと数式をすべて抽出し、Markdown形式で出力してください。

ルール:
- 通常のテキストはそのままMarkdownで出力
- 数式はLaTeX記法で出力: インライン数式は $...$ 、ディスプレイ数式は $$...$$ で囲む
- 日本語テキストはそのまま日本語で出力
- 表がある場合はMarkdownテーブルで出力
- 図や手書き文字もできる限り読み取る
- 画像内の構造（見出し、箇条書きなど）を保持する
- 余計な説明は不要。抽出結果のみを出力すること"""


class OcrService:
    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.1,
        )

    async def extract(self, image_base64: str, mime_type: str) -> str:
        """base64エンコードされた画像からテキスト・数式を抽出する"""
        message = HumanMessage(
            content=[
                {"type": "text", "text": OCR_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_base64}",
                    },
                },
            ],
        )
        response = await self.llm.ainvoke([message])
        return str(response.content).strip()

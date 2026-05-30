"""テキストからメタ情報を生成するサービス"""
import json
import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

META_GENERATION_PROMPT = """以下の数学テキストを分析し、学習サポートAIが対話で使うためのメタ情報をJSON形式で生成してください。

## 出力形式（JSON）
{{
  "goal": "このテキストの学習ゴール（1文）",
  "key_points": ["押さえるべきポイント1", "ポイント2", ...],
  "common_mistakes": ["つまずきやすい箇所1", "箇所2", ...],
  "hints": [
    {{"level": 1, "text": "最初のヒント（軽い）"}},
    {{"level": 2, "text": "もう少し踏み込んだヒント"}},
    {{"level": 3, "text": "ほぼ答えに近いヒント"}}
  ],
  "connections": ["関連する話題1", "話題2", ...],
  "depth_levels": {{
    "basic": "基本的な説明",
    "intermediate": "中級の説明",
    "advanced": "発展的な説明"
  }},
  "prerequisites": ["前提知識1", "前提知識2", ...]
}}

JSONのみを出力してください。説明文は不要です。"""


class MetaGenerator:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=api_key,
            temperature=0.3,
        )

    async def generate(self, text_content: str) -> dict:
        messages = [
            SystemMessage(content=META_GENERATION_PROMPT),
            HumanMessage(content=text_content),
        ]
        response = await self.llm.ainvoke(messages)
        content = str(response.content).strip()

        # Extract JSON from response (handle markdown code blocks)
        if content.startswith("```"):
            lines = content.split("\n")
            # Remove first and last lines (```json and ```)
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```") and not in_block:
                    in_block = True
                    continue
                elif line.startswith("```") and in_block:
                    break
                elif in_block:
                    json_lines.append(line)
            content = "\n".join(json_lines)

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"goal": "メタ情報の生成に失敗しました", "raw": content}

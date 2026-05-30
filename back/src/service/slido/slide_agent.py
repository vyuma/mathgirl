"""LLM を使って Marp Markdown スライドを生成するエージェント"""
import os
import re

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

SLIDE_SYSTEM_PROMPT = """あなたは数学教育のスライド作成専門家です。
与えられたテーマについて、Marp 形式の教育スライドを生成してください。

## 出力ルール
- 必ず以下のフロントマターから始める:
  ---
  marp: true
  math: mathjax
  theme: default
  paginate: true
  ---
- スライドは --- で区切る
- インライン数式: $式$、ブロック数式: $$式$$
- LaTeX 標準構文を使用（\\frac, \\sqrt, \\sum, \\int, \\alpha 等）
- 出力は Marp Markdown のみ（```コードブロックで囲まない）
- 日本語で記述する
- 各スライドには明確なタイトルと説明を含める
- 数式は必ず正しい LaTeX 構文で記述する
- 必ず一枚でおさまる量でスライドを作成する。
"""


class SlideAgent:
    async def generate(self, topic: str, session_context: str | None = None, slide_count: int = 8) -> str:
        api_key = os.getenv("GOOGLE_API_KEY")
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=api_key,
            temperature=0.7,
        )

        context_part = ""
        if session_context:
            context_part = f"\n\n## セッションコンテキスト\n{session_context}\n"

        user_msg = f"テーマ: {topic}{context_part}\nスライド枚数: {slide_count}枚（表紙含む）"

        response = await llm.ainvoke([
            SystemMessage(content=SLIDE_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])

        markdown = str(response.content).strip()
        # コードフェンス除去
        markdown = re.sub(r'^```(?:markdown)?\n?', '', markdown)
        markdown = re.sub(r'\n?```$', '', markdown)
        return markdown

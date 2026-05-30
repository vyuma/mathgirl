"""セッション終了時に対話内容を要約してタイトルを生成するサービス"""
import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from db.models import DialogMessage

SUMMARY_SYSTEM_PROMPT = """あなたは学習セッションの要約者です。
以下の対話履歴を読み、「何を学んだか」を短い1行で要約してください。

ルール:
- 30文字以内の日本語で出力
- タイトルとして使えるよう簡潔に
- 余計な記号や説明は不要
- 要約のみを出力"""


async def generate_session_summary(messages: list[DialogMessage]) -> str | None:
    """対話メッセージのリストからセッションタイトル用の要約を生成する。

    メッセージが2件未満の場合は None を返す。
    """
    if len(messages) < 2:
        return None

    dialog_text = "\n".join(
        f"{msg.role}: {msg.content}" for msg in messages
    )

    api_key = os.getenv("GOOGLE_API_KEY")
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite-preview",
        google_api_key=api_key,
        temperature=0.3,
    )

    response = await llm.ainvoke([
        SystemMessage(content=SUMMARY_SYSTEM_PROMPT),
        HumanMessage(content=dialog_text),
    ])

    summary = str(response.content).strip()
    # 長すぎる場合は切り詰め
    if len(summary) > 50:
        summary = summary[:50]
    return summary

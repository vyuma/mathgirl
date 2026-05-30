import os
from typing import AsyncGenerator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from model.speak_chat.chat import ChatMessage
from .prompt import ALICE_SYSTEM_PROMPT
from .sentence_splitter import SentenceSplitter


# シングルトンLLMインスタンス（接続の再利用で高速化）
_llm_instance: ChatGoogleGenerativeAI | None = None


def _get_llm(model_name: str = "gemini-3.1-flash-lite") -> ChatGoogleGenerativeAI:
    """LLMインスタンスを取得（シングルトン）"""
    global _llm_instance
    if _llm_instance is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")

        _llm_instance = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.7,
        )
    return _llm_instance


class AliceAgent:
    """アリス用AIエージェント（LangChain + Gemini）"""

    def __init__(self, model_name: str = "gemini-3.1-flash-lite"):
        self.llm = _get_llm(model_name)
        self.sentence_splitter = SentenceSplitter()

    def _build_messages(
        self, messages: list[ChatMessage], goal: str | None = None
    ) -> list:
        """LangChain用のメッセージリストを構築"""
        # システムプロンプトを作成
        goal_text = goal if goal else "特に設定されていません"
        system_prompt = ALICE_SYSTEM_PROMPT.format(goal=goal_text)

        langchain_messages = [SystemMessage(content=system_prompt)]

        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            else:
                langchain_messages.append(AIMessage(content=msg.content))

        return langchain_messages

    async def stream_sentences(
        self, messages: list[ChatMessage], goal: str | None = None
    ) -> AsyncGenerator[tuple[int, str, bool], None]:
        """
        文単位でストリーミング応答を生成

        Args:
            messages: チャット履歴
            goal: 今日の目標

        Yields:
            (index, text, is_partial) のタプル
            - index: 文のインデックス
            - text: 文のテキスト
            - is_partial: 部分的な文かどうか
        """
        langchain_messages = self._build_messages(messages, goal)
        self.sentence_splitter.reset()

        sentence_index = 0

        async for chunk in self.llm.astream(langchain_messages):
            if chunk.content:
                # チャンクをSentenceSplitterに渡す
                for sentence in self.sentence_splitter.feed(chunk.content):
                    yield (sentence_index, sentence, False)
                    sentence_index += 1

        # バッファに残った内容を出力
        remaining = self.sentence_splitter.flush()
        if remaining:
            yield (sentence_index, remaining, True)

    async def generate(
        self, messages: list[ChatMessage], goal: str | None = None
    ) -> str:
        """
        完全な応答を生成（非ストリーミング）

        Args:
            messages: チャット履歴
            goal: 今日の目標

        Returns:
            完全な応答テキスト
        """
        langchain_messages = self._build_messages(messages, goal)
        response = await self.llm.ainvoke(langchain_messages)
        return str(response.content)

"""Session chat agent using LangChain Tool Calling."""
import json
import os
from typing import AsyncGenerator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from model.speak_chat.chat import ChatMessage
from agent.original_chat.sentence_splitter import SentenceSplitter
from .prompt import SESSION_SYSTEM_PROMPT
from .tools import SESSION_TOOLS, get_and_clear_tool_results

_llm_instance: ChatGoogleGenerativeAI | None = None


def _get_llm(model_name: str = "gemini-2.5-flash") -> ChatGoogleGenerativeAI:
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


class SessionAgent:
    """セッション用AIエージェント（LangChain Tool Calling）"""

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.llm = _get_llm(model_name)
        self.llm_with_tools = self.llm.bind_tools(SESSION_TOOLS)
        self.sentence_splitter = SentenceSplitter()

    def _build_messages(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> list:
        meta_str = json.dumps(meta_info, ensure_ascii=False, indent=2) if meta_info else "まだ生成されていません"
        text_str = text_content or "テキストは設定されていません"

        system_prompt = SESSION_SYSTEM_PROMPT.format(
            text_content=text_str,
            meta_info=meta_str,
        )

        langchain_messages = [SystemMessage(content=system_prompt)]
        for msg in messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            else:
                langchain_messages.append(AIMessage(content=msg.content))
        return langchain_messages

    async def stream_sentences(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> AsyncGenerator[tuple[int, str, bool], None]:
        """文単位でストリーミング応答を生成。ツール呼び出しも処理する。"""
        langchain_messages = self._build_messages(messages, text_content, meta_info)
        self.sentence_splitter.reset()

        # Clear any previous tool results
        get_and_clear_tool_results()

        sentence_index = 0

        # First, invoke with tools to allow tool calling
        response = await self.llm_with_tools.ainvoke(langchain_messages)

        # Handle tool calls if present
        if response.tool_calls:
            for tool_call in response.tool_calls:
                # Execute tool
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                for t in SESSION_TOOLS:
                    if t.name == tool_name:
                        t.invoke(tool_args)
                        break

        # Get the text content from the response
        text_content_response = str(response.content) if response.content else ""

        if text_content_response:
            # Split into sentences and yield
            for sentence in self.sentence_splitter.feed(text_content_response):
                yield (sentence_index, sentence, False)
                sentence_index += 1

            remaining = self.sentence_splitter.flush()
            if remaining:
                yield (sentence_index, remaining, True)

    def get_tool_results(self) -> list[dict]:
        """最新のツール呼び出し結果を取得"""
        return get_and_clear_tool_results()

    async def generate(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> str:
        langchain_messages = self._build_messages(messages, text_content, meta_info)
        response = await self.llm_with_tools.ainvoke(langchain_messages)

        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                for t in SESSION_TOOLS:
                    if t.name == tool_name:
                        t.invoke(tool_args)
                        break

        return str(response.content) if response.content else ""

"""Session chat agent using LangChain Tool Calling."""
import ast
import asyncio
import json
import inspect
import os
import re
from typing import AsyncGenerator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from model.speak_chat.chat import ChatMessage
from agent.original_chat.sentence_splitter import SentenceSplitter
from .prompt import SESSION_SYSTEM_PROMPT
from .tools import SESSION_TOOLS, get_and_clear_tool_results

_llm_instance: ChatGoogleGenerativeAI | None = None


def _get_llm(model_name: str = "gemini-3.1-flash-lite-preview") -> ChatGoogleGenerativeAI:
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


_MATH_PATTERN = re.compile(
    r'\$\$[^$]+\$\$'   # $$...$$
    r'|\$[^$]+\$'      # $...$
    r'|\\[a-zA-Z]+\{'  # \frac{, \sqrt{, etc.
)


class SessionAgent:
    """セッション用AIエージェント（LangChain Tool Calling）"""

    def __init__(self, model_name: str = "gemini-3.1-flash-lite-preview"):
        self.llm = _get_llm(model_name)
        self.llm_with_tools = self.llm.bind_tools(SESSION_TOOLS)
        self.sentence_splitter = SentenceSplitter()
        self._pending_tool_results: list[dict] = []
        self._speech_text: str = ""

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

    @staticmethod
    def _strip_math(text: str) -> str:
        """Strip LaTeX/math notation from text for clean TTS."""
        text = _MATH_PATTERN.sub("", text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    @staticmethod
    def _extract_tool_calls_from_text(content: str) -> list[tuple[str, dict]]:
        """LLMがテキストとしてツール呼び出しを出力した場合のフォールバックパーサー。

        content 中の tool_name(...) パターンを検出し、(tool_name, kwargs) のリストを返す。
        """
        tool_map = {t.name: t for t in SESSION_TOOLS}
        tool_names_re = "|".join(re.escape(n) for n in tool_map)

        # Quick check
        if not re.search(rf'(?:{tool_names_re})\s*\(', content):
            return []

        # Match: optional print()/prefix. + tool_name(
        pattern = re.compile(
            rf'(?:print\s*\(\s*)?(?:\w+\.)?({tool_names_re})\s*\('
        )

        results: list[tuple[str, dict]] = []
        pos = 0
        while pos < len(content):
            m = pattern.search(content, pos)
            if not m:
                break

            tool_name = m.group(1)
            # Find the opening '(' that belongs to this tool call
            open_paren = m.end() - 1  # the '(' matched by the pattern

            # Walk forward to find the matching ')'
            depth = 1
            i = open_paren + 1
            in_string: str | None = None
            while i < len(content) and depth > 0:
                c = content[i]
                if in_string:
                    if c == '\\':
                        i += 2
                        continue
                    if c == in_string:
                        in_string = None
                else:
                    if c in ('"', "'"):
                        in_string = c
                    elif c == '(':
                        depth += 1
                    elif c == ')':
                        depth -= 1
                i += 1

            if depth != 0:
                pos = m.end()
                continue

            args_str = content[open_paren + 1 : i - 1]

            try:
                tree = ast.parse(f"_f({args_str})", mode='eval')
                call_node = tree.body
                assert isinstance(call_node, ast.Call)

                kwargs: dict = {}
                # keyword arguments
                for kw in call_node.keywords:
                    if kw.arg is not None:
                        kwargs[kw.arg] = ast.literal_eval(kw.value)

                # positional arguments → map to parameter names
                if call_node.args:
                    tool_func = tool_map[tool_name]
                    sig = inspect.signature(tool_func.func)
                    param_names = list(sig.parameters.keys())
                    for idx, arg_node in enumerate(call_node.args):
                        if idx < len(param_names) and param_names[idx] not in kwargs:
                            kwargs[param_names[idx]] = ast.literal_eval(arg_node)

                results.append((tool_name, kwargs))
            except Exception as e:
                print(f"[fallback-parser] Failed to parse {tool_name}(...): {e}")

            pos = i

        return results

    async def invoke(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> None:
        """Invoke LLM, process tool calls, separate speak text from other tool results."""
        langchain_messages = self._build_messages(messages, text_content, meta_info)

        # Clear any previous tool results
        get_and_clear_tool_results()

        response = await self.llm_with_tools.ainvoke(langchain_messages)

        # Execute tool calls
        tool_map = {t.name: t for t in SESSION_TOOLS}
        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                if tool_name in tool_map:
                    tool_map[tool_name].invoke(tool_args)
        else:
            # Fallback: LLM sometimes outputs tool calls as text instead of
            # using function calling. Parse and execute them.
            raw_content = str(response.content) if response.content else ""
            parsed_calls = self._extract_tool_calls_from_text(raw_content)
            if parsed_calls:
                print(f"[SessionAgent] Fallback parser recovered {len(parsed_calls)} tool call(s) from text output")
                for t_name, t_args in parsed_calls:
                    if t_name in tool_map:
                        tool_map[t_name].invoke(t_args)

        # Separate speak results from other tool results
        all_results = get_and_clear_tool_results()
        speak_texts = [r["text"] for r in all_results if r["type"] == "speak"]
        self._pending_tool_results = [r for r in all_results if r["type"] != "speak"]

        # Use speak tool text; fall back to response.content with math stripped
        if speak_texts:
            self._speech_text = "".join(speak_texts)
        else:
            raw = str(response.content) if response.content else ""
            # If fallback parser already handled the content, don't use it as speech
            if self._pending_tool_results:
                self._speech_text = ""
            else:
                self._speech_text = self._strip_math(raw)

    async def stream_sentences(
        self,
        messages: list[ChatMessage] | None = None,
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> AsyncGenerator[tuple[int, str, bool], None]:
        """文単位でストリーミング応答を生成。

        invoke() を先に呼んだ場合は messages=None で呼ぶ（準備済みテキストを使用）。
        messages を渡した場合は内部で invoke() を実行する（後方互換）。
        """
        if messages is not None:
            await self.invoke(messages, text_content, meta_info)

        self.sentence_splitter.reset()
        sentence_index = 0

        if self._speech_text:
            for sentence in self.sentence_splitter.feed(self._speech_text):
                yield (sentence_index, sentence, False)
                sentence_index += 1

            remaining = self.sentence_splitter.flush()
            if remaining:
                yield (sentence_index, remaining, True)

    def get_tool_results(self) -> list[dict]:
        """最新のツール呼び出し結果を取得（speak以外）"""
        results = self._pending_tool_results.copy()
        self._pending_tool_results.clear()
        return results

    async def stream_react(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> AsyncGenerator[dict, None]:
        """ReActスタイルのストリーミング実行。

        speakツール結果を他ツールより先にyieldすることで、
        TTS音声合成を即座に開始できるようにする。

        Yields:
            dict: ツール結果。typeフィールドで種別判別。
                  speakが最初にyieldされ、残りは後続する。
        """
        langchain_messages = self._build_messages(messages, text_content, meta_info)
        get_and_clear_tool_results()
        tool_map = {t.name: t for t in SESSION_TOOLS}

        # LLMレスポンスをストリーミングで受信（ainvokeより早くon_chat_model_endが届く）
        output = None
        async for event in self.llm_with_tools.astream_events(langchain_messages, version="v2"):
            if event["event"] == "on_chat_model_end":
                output = event["data"]["output"]
                break

        if output is None:
            return

        tool_calls = getattr(output, "tool_calls", None) or []

        if not tool_calls:
            # フォールバック: テキストからツール呼び出しを解析
            raw_content = str(output.content) if output.content else ""
            parsed = self._extract_tool_calls_from_text(raw_content)
            if parsed:
                print(f"[SessionAgent] stream_react fallback: {len(parsed)} tool call(s)")
                for t_name, t_args in parsed:
                    if t_name in tool_map:
                        tool_map[t_name].invoke(t_args)
            else:
                stripped = self._strip_math(raw_content)
                if stripped:
                    yield {"type": "speak", "text": stripped}
                    return
            for r in get_and_clear_tool_results():
                yield r
            return

        # 1. speakを先に実行して即yield → 呼び出し側がTTSを早期開始できる
        speak_calls = [tc for tc in tool_calls if tc["name"] == "speak"]
        other_calls = [tc for tc in tool_calls if tc["name"] != "speak"]

        for tc in speak_calls:
            tool_map["speak"].invoke(tc["args"])
        for r in get_and_clear_tool_results():
            yield r

        # 2. 残りのツールを実行してyield
        for tc in other_calls:
            name = tc["name"]
            if name in tool_map:
                tool_map[name].invoke(tc["args"])
        for r in get_and_clear_tool_results():
            yield r

    async def generate(
        self,
        messages: list[ChatMessage],
        text_content: str | None = None,
        meta_info: dict | None = None,
    ) -> str:
        await self.invoke(messages, text_content, meta_info)
        return self._speech_text

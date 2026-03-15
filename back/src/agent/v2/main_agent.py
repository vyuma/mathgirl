"""MainAgent: content generation agent using MetaContext."""
import ast
import inspect
import json
import os
import re
from typing import AsyncGenerator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from model.speak_chat.chat import ChatMessage
from agent.original_chat.sentence_splitter import SentenceSplitter
from .types import MetaContext
from .main_tools import MainToolsContext
from .prompts import MAIN_SYSTEM_PROMPT

_MATH_PATTERN = re.compile(
    r'\$\$[^$]+\$\$'
    r'|\$[^$]+\$'
    r'|\\[a-zA-Z]+\{'
)


class MainAgent:
    """Generates teaching content using MetaContext from MetaAgent."""

    def __init__(self, model_name: str = "gemini-2.5-flash-lite"):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        self._llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=0.7,
        )
        self.sentence_splitter = SentenceSplitter()

    @staticmethod
    def _strip_math(text: str) -> str:
        text = _MATH_PATTERN.sub("", text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    @staticmethod
    def _extract_tool_calls_from_text(content: str, tools: list) -> list[tuple[str, dict]]:
        """Fallback parser for when LLM outputs tool calls as text."""
        tool_map = {t.name: t for t in tools}
        tool_names_re = "|".join(re.escape(n) for n in tool_map)
        if not re.search(rf'(?:{tool_names_re})\s*\(', content):
            return []

        pattern = re.compile(rf'(?:print\s*\(\s*)?(?:\w+\.)?({tool_names_re})\s*\(')
        results: list[tuple[str, dict]] = []
        pos = 0
        while pos < len(content):
            m = pattern.search(content, pos)
            if not m:
                break
            tool_name = m.group(1)
            open_paren = m.end() - 1
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
            args_str = content[open_paren + 1: i - 1]
            try:
                tree = ast.parse(f"_f({args_str})", mode='eval')
                call_node = tree.body
                assert isinstance(call_node, ast.Call)
                kwargs: dict = {}
                for kw in call_node.keywords:
                    if kw.arg is not None:
                        kwargs[kw.arg] = ast.literal_eval(kw.value)
                if call_node.args:
                    tool_func = tool_map[tool_name]
                    sig = inspect.signature(tool_func.func)
                    param_names = list(sig.parameters.keys())
                    for idx, arg_node in enumerate(call_node.args):
                        if idx < len(param_names) and param_names[idx] not in kwargs:
                            kwargs[param_names[idx]] = ast.literal_eval(arg_node)
                results.append((tool_name, kwargs))
            except Exception as e:
                print(f"[MainAgent fallback-parser] Failed to parse {tool_name}(...): {e}")
            pos = i
        return results

    def _build_messages(
        self,
        messages: list[ChatMessage],
        text_content: str | None,
        meta_context: MetaContext,
    ) -> list:
        text_str = text_content or "テキストは設定されていません"
        state = meta_context.state
        system_prompt = MAIN_SYSTEM_PROMPT.format(
            text_content=text_str,
            understanding_level=state.understanding_level,
            emotion=state.emotion,
            strategy=state.strategy,
            strategy_instruction=meta_context.strategy_instruction,
        )
        lc_messages = [SystemMessage(content=system_prompt)]
        for msg in messages:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            else:
                lc_messages.append(AIMessage(content=msg.content))
        return lc_messages

    async def stream_react_main(
        self,
        messages: list[ChatMessage],
        text_content: str | None,
        meta_context: MetaContext,
    ) -> AsyncGenerator[dict, None]:
        """Stream tool results. speak is yielded first to enable early TTS."""
        ctx = MainToolsContext()
        tools = ctx.make_tools()
        tool_map = {t.name: t for t in tools}
        llm_with_tools = self._llm.bind_tools(tools)
        lc_messages = self._build_messages(messages, text_content, meta_context)

        output = None
        async for event in llm_with_tools.astream_events(lc_messages, version="v2"):
            if event["event"] == "on_chat_model_end":
                output = event["data"]["output"]
                break

        if output is None:
            return

        tool_calls = getattr(output, "tool_calls", None) or []

        if not tool_calls:
            raw_content = str(output.content) if output.content else ""
            parsed = self._extract_tool_calls_from_text(raw_content, tools)
            if parsed:
                print(f"[MainAgent] stream_react fallback: {len(parsed)} tool call(s)")
                for t_name, t_args in parsed:
                    if t_name in tool_map:
                        tool_map[t_name].invoke(t_args)
            else:
                stripped = self._strip_math(raw_content)
                if stripped:
                    yield {"type": "speak", "text": stripped}
                    return
            for r in ctx.pop_results():
                yield r
            return

        # Yield speak first for early TTS
        speak_calls = [tc for tc in tool_calls if tc["name"] == "speak"]
        other_calls = [tc for tc in tool_calls if tc["name"] != "speak"]

        for tc in speak_calls:
            tool_map["speak"].invoke(tc["args"])
        for r in ctx.pop_results():
            yield r

        for tc in other_calls:
            name = tc["name"]
            if name in tool_map:
                tool_map[name].invoke(tc["args"])
        for r in ctx.pop_results():
            yield r

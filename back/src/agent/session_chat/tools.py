"""LangChain Tool definitions for session chat agent."""
from typing import Any

from langchain_core.tools import tool


# Tool results are collected here and sent via WebSocket by the caller
_tool_results: list[dict[str, Any]] = []


def get_and_clear_tool_results() -> list[dict[str, Any]]:
    global _tool_results
    results = _tool_results.copy()
    _tool_results.clear()
    return results


@tool
def write_to_blackboard(latex: str, explanation: str) -> str:
    """黒板に数式を表示する。学習者に見せたい数式をLaTeX形式で指定する。

    Args:
        latex: LaTeX形式の数式
        explanation: この数式を表示する理由の説明
    """
    _tool_results.append({
        "type": "blackboard_update",
        "latex": latex,
        "explanation": explanation,
    })
    return f"黒板に {latex} を表示しました"


@tool
def give_hint(hint_text: str, related_latex: str = "") -> str:
    """学習者が困っているときにヒントを与える。段階的に出す。

    Args:
        hint_text: ヒントのテキスト
        related_latex: 関連する数式（LaTeX形式、任意）
    """
    _tool_results.append({
        "type": "hint",
        "hint_text": hint_text,
        "related_latex": related_latex or None,
    })
    return f"ヒントを提示しました: {hint_text}"


@tool
def suggest_operation(latex: str, operation: str, explanation: str) -> str:
    """学習者に式操作を提案する。

    Args:
        latex: 操作対象の数式（LaTeX形式）
        operation: 操作の種類（expand/factor/simplify/derivative/integrate）
        explanation: この操作を提案する理由
    """
    _tool_results.append({
        "type": "suggest_operation",
        "latex": latex,
        "operation": operation,
        "explanation": explanation,
    })
    return f"{operation} を提案しました: {latex}"


SESSION_TOOLS = [write_to_blackboard, give_hint, suggest_operation]

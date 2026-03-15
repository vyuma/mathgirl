"""LangChain Tool definitions for V2 MainAgent (instance-scoped, no globals)."""
from typing import Any

from langchain_core.tools import tool


class MainToolsContext:
    """Holds per-request tool results to avoid global state races in concurrent sessions."""

    def __init__(self):
        self._results: list[dict[str, Any]] = []

    def make_tools(self) -> list:
        """Return 6 LangChain tools bound to this context instance."""
        results = self._results  # closure

        @tool
        def speak(text: str) -> str:
            """学習者に声で話しかける。音声合成されるテキスト。

            Args:
                text: 話す内容。自然な日本語のみ。数式・LaTeX記号・変数名（x, y, f(x)等）は絶対に含めないこと。
            """
            results.append({"type": "speak", "text": text})
            return f"「{text}」と話しました"

        @tool
        def write_to_blackboard(latex: str, explanation: str) -> str:
            """黒板に数式を表示する。学習者に見せたい数式をLaTeX形式で指定する。

            Args:
                latex: LaTeX形式の数式
                explanation: この数式を表示する理由の説明
            """
            results.append({"type": "blackboard_update", "latex": latex, "explanation": explanation})
            return f"黒板に {latex} を表示しました"

        @tool
        def suggest_operation(latex: str, operation: str, explanation: str) -> str:
            """学習者に式操作を提案する。

            Args:
                latex: 操作対象の数式（LaTeX形式）
                operation: 操作の種類（expand/factor/simplify/derivative/integrate）
                explanation: この操作を提案する理由
            """
            results.append({"type": "suggest_operation", "latex": latex, "operation": operation, "explanation": explanation})
            return f"{operation} を提案しました: {latex}"

        @tool
        def pose_question(
            question_text: str,
            question_if_correct: str,
            question_if_stuck: str,
            visual_hint_latex: str = "",
            current_understanding_level: int = 0,
        ) -> str:
            """ソクラテス式の問いを構造化して提示する。正解時と詰まった時の次の問いも用意する。

            Args:
                question_text: 学習者に投げかける問い
                question_if_correct: 学習者が正しく答えた場合の次の問い
                question_if_stuck: 学習者が詰まった場合のヒントとなる問い
                visual_hint_latex: 視覚的ヒントとなるLaTeX数式（任意）
                current_understanding_level: 現在の推定理解度（0-5）
            """
            results.append({
                "type": "socratic_question",
                "question_text": question_text,
                "question_if_correct": question_if_correct,
                "question_if_stuck": question_if_stuck,
                "visual_hint_latex": visual_hint_latex or None,
                "current_understanding_level": current_understanding_level,
            })
            return f"問いを提示しました: {question_text}"

        @tool
        def generate_animation(text: str, additional_instructions: str = "") -> str:
            """数学的な概念のアニメーションを生成する。回転体、グラフの変化、幾何学的変換など視覚化が有効な場面で使う。

            Args:
                text: アニメーション化したい数学的概念の説明
                additional_instructions: 追加の指示（色、速度、視点など）
            """
            results.append({"type": "animation_request", "text": text, "additional_instructions": additional_instructions})
            return f"アニメーション生成をリクエストしました: {text}"

        @tool
        def edit_animation(generation_id: int, prior_video_id: str, enhance_prompt: str) -> str:
            """既存のアニメーションを編集・修正する。色変更、速度調整、視点変更などに使う。

            Args:
                generation_id: 編集対象のアニメーションのgeneration_id（整数）
                prior_video_id: 編集対象の動画のvideo_id
                enhance_prompt: 修正内容の説明
            """
            results.append({"type": "animation_edit_request", "generation_id": generation_id, "prior_video_id": prior_video_id, "enhance_prompt": enhance_prompt})
            return f"アニメーション編集をリクエストしました: {enhance_prompt}"

        return [speak, write_to_blackboard, suggest_operation, pose_question, generate_animation, edit_animation]

    def pop_results(self) -> list[dict[str, Any]]:
        results = self._results.copy()
        self._results.clear()
        return results

"""スライド生成サービス"""
from .slide_agent import SlideAgent
from .marp_converter import MarpConverter


class SlidoService:
    async def generate_slides(
        self,
        topic: str,
        session_context: str | None = None,
        slide_count: int = 8,
    ) -> tuple[str, str]:
        """Marp Markdown を生成し HTML に変換して返す。

        Returns:
            (markdown, html) のタプル
        """
        markdown = await SlideAgent().generate(topic, session_context, slide_count)
        html = await MarpConverter().convert(markdown)
        return markdown, html

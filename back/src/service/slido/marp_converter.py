"""Marp CLI を使って Markdown を HTML スライドに変換するコンバーター"""
import asyncio
import shutil
import tempfile
import os


class MarpConversionError(Exception):
    pass


class MarpConverter:
    MARP_CMD = "/usr/local/bin/marp"

    def _get_marp_cmd(self) -> str:
        if os.path.exists(self.MARP_CMD):
            return self.MARP_CMD
        found = shutil.which("marp")
        if found:
            return found
        raise MarpConversionError("marp コマンドが見つかりません。npm install -g @marp-team/marp-cli を実行してください。")

    async def convert(self, markdown: str) -> str:
        marp_cmd = self._get_marp_cmd()

        with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as md_file:
            md_path = md_file.name
            md_file.write(markdown)

        html_path = md_path.replace(".md", ".html")

        try:
            proc = await asyncio.create_subprocess_exec(
                marp_cmd, md_path, "--html", "-o", html_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                await asyncio.wait_for(proc.wait(), timeout=30.0)
            except asyncio.TimeoutError:
                proc.kill()
                raise MarpConversionError("marp の変換がタイムアウトしました（30秒）")

            if proc.returncode != 0:
                stderr = await proc.stderr.read() if proc.stderr else b""
                raise MarpConversionError(f"marp 変換エラー (code {proc.returncode}): {stderr.decode()}")

            with open(html_path, encoding="utf-8") as f:
                return f.read()
        finally:
            if os.path.exists(md_path):
                os.unlink(md_path)
            if os.path.exists(html_path):
                os.unlink(html_path)

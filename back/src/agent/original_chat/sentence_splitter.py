import re
from typing import Generator


class SentenceSplitter:
    """日本語テキストを文単位で分割するクラス"""

    # 文末パターン（句点、感嘆符、疑問符など）
    SENTENCE_ENDINGS = re.compile(r'([。！？!?]+)')
    # 括弧内の文末は分割しない
    BRACKETS = re.compile(r'[「」『』（）()]')

    def __init__(self):
        self._buffer = ""
        self._bracket_depth = 0

    def reset(self):
        """バッファをリセット"""
        self._buffer = ""
        self._bracket_depth = 0

    def feed(self, text: str) -> Generator[str, None, None]:
        """
        テキストを受け取り、完成した文を順次yield

        Args:
            text: 追加するテキスト

        Yields:
            完成した文（句点を含む）
        """
        self._buffer += text

        while True:
            # 括弧の深さを追跡しながら文末を探す
            sentence_end = self._find_sentence_end()
            if sentence_end == -1:
                break

            # 文を切り出し
            sentence = self._buffer[: sentence_end + 1].strip()
            self._buffer = self._buffer[sentence_end + 1 :]

            if sentence:
                yield sentence

    def flush(self) -> str | None:
        """バッファに残ったテキストを返す"""
        if self._buffer.strip():
            result = self._buffer.strip()
            self._buffer = ""
            return result
        return None

    def _find_sentence_end(self) -> int:
        """
        文末位置を見つける
        括弧内の文末は無視する

        Returns:
            文末位置（見つからない場合は-1）
        """
        bracket_depth = 0

        for i, char in enumerate(self._buffer):
            # 括弧の開始
            if char in "「『（(":
                bracket_depth += 1
            # 括弧の終了
            elif char in "」』）)":
                bracket_depth = max(0, bracket_depth - 1)
            # 文末文字（括弧外のみ）
            elif bracket_depth == 0 and char in "。！？!?":
                # 連続する文末記号をまとめて処理
                end = i
                while end + 1 < len(self._buffer) and self._buffer[end + 1] in "。！？!?":
                    end += 1
                return end

        return -1


def split_into_sentences(text: str) -> list[str]:
    """
    テキストを文のリストに分割するユーティリティ関数

    Args:
        text: 分割するテキスト

    Returns:
        文のリスト
    """
    splitter = SentenceSplitter()
    sentences = list(splitter.feed(text))

    # バッファに残った内容も追加
    remaining = splitter.flush()
    if remaining:
        sentences.append(remaining)

    return sentences

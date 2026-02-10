"use client";

import { useRef, useState } from "react";
import NoteEditor from "@/components/note/NoteEditor";
import { useNoteStore } from "@/stores/noteStore";

export default function NotePanel({
  onShowToAlice,
}: {
  onShowToAlice?: (text: string) => void;
}) {
  const { isDirty, content } = useNoteStore();
  const [isSending, setIsSending] = useState(false);

  // 文字数カウント
  const charCount = content.length;
  const lineCount = content.split("\n").length;

  const handleShowToAlice = () => {
    if (isSending || !content.trim() || !onShowToAlice) {
      return;
    }

    setIsSending(true);
    onShowToAlice(`私のノートを見て！\n\n${content}`);

    // 3秒後に再送信可能に
    setTimeout(() => {
      setIsSending(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ステータスバー */}
      <div className="flex items-center justify-between mb-2 text-xs text-amber-500">
        <div className="flex items-center gap-3">
          <span>{charCount} 文字</span>
          <span>{lineCount} 行</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full ${
              isDirty
                ? "bg-orange-100 text-orange-600"
                : "bg-green-100 text-green-600"
            }`}
          >
            {isDirty ? "● 編集中" : "✓ 保存済み"}
          </span>
        </div>
      </div>

      {/* エディタ */}
      <div className="flex-1 min-h-0">
        <NoteEditor />
      </div>

      {/* アリスに見せるボタン */}
      {onShowToAlice && content.trim() && (
        <div className="mt-2 pt-2 border-t border-amber-100">
          <button
            type="button"
            onClick={handleShowToAlice}
            disabled={isSending}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              isSending
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            }`}
          >
            <span>{isSending ? "⏳" : "👀"}</span>
            <span>{isSending ? "送信中..." : "アリスに見せる"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

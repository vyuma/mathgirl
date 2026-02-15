"use client";

import { useCallback, useMemo, useRef } from "react";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { useNoteStore } from "@/stores/noteStore";
import { useOcr } from "@/hooks/useOcr";

const formatButtons = [
  { icon: "B", label: "太字", prefix: "**", suffix: "**", key: "b" },
  { icon: "I", label: "斜体", prefix: "*", suffix: "*", key: "i" },
  { icon: "H1", label: "見出し1", prefix: "# ", suffix: "", key: "" },
  { icon: "H2", label: "見出し2", prefix: "## ", suffix: "", key: "" },
  { icon: "•", label: "リスト", prefix: "- ", suffix: "", key: "" },
  { icon: "☑", label: "チェック", prefix: "- [ ] ", suffix: "", key: "" },
  { icon: "</>", label: "コード", prefix: "`", suffix: "`", key: "" },
  { icon: "∑", label: "数式", prefix: "$", suffix: "$", key: "m" },
];

export default function NoteEditor() {
  const {
    content,
    viewMode,
    isOcrProcessing,
    ocrError,
    imagePreviews,
    setContent,
    setViewMode,
    setOcrError,
    removeImagePreview,
  } = useNoteStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processImage } = useOcr();

  const mdast = useMemo(() => {
    if (!content) return null;
    try {
      return parseMarkdown(content);
    } catch {
      return null;
    }
  }, [content]);

  const insertFormatting = useCallback(
    (prefix: string, suffix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const newText =
        content.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        content.substring(end);

      setContent(newText);

      setTimeout(() => {
        textarea.focus();
        const cursorPos =
          start +
          prefix.length +
          (selectedText ? selectedText.length + suffix.length : 0);
        textarea.setSelectionRange(
          selectedText ? cursorPos : start + prefix.length,
          selectedText ? cursorPos : start + prefix.length,
        );
      }, 0);
    },
    [content, setContent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.metaKey || e.ctrlKey) {
        const btn = formatButtons.find((b) => b.key === e.key);
        if (btn) {
          e.preventDefault();
          insertFormatting(btn.prefix, btn.suffix);
        }
      }

      // Tab でインデント
      if (e.key === "Tab") {
        e.preventDefault();
        insertFormatting("  ", "");
      }
    },
    [insertFormatting],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processImage(file);
      }
      // リセットして同じファイルを再選択可能にする
      e.target.value = "";
    },
    [processImage],
  );

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー */}
      <div className="flex items-center gap-1 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl border border-amber-200 border-b-0">
        {/* フォーマットボタン */}
        <div className="flex gap-0.5">
          {formatButtons.map((btn) => (
            <button
              key={btn.icon}
              type="button"
              onClick={() => insertFormatting(btn.prefix, btn.suffix)}
              className="w-8 h-8 text-xs font-bold bg-white/80 hover:bg-white border border-amber-200 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-900 transition shadow-sm"
              title={
                btn.label + (btn.key ? ` (⌘${btn.key.toUpperCase()})` : "")
              }
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* OCRアップロードボタン */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isOcrProcessing}
          className="w-8 h-8 text-xs font-bold bg-white/80 hover:bg-white border border-amber-200 rounded-lg flex items-center justify-center text-amber-700 hover:text-amber-900 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ml-1"
          title="画像からテキスト抽出 (OCR)"
        >
          {isOcrProcessing ? "⏳" : "📷"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex-1" />

        {/* 表示切替 */}
        <div className="flex bg-white/80 rounded-lg p-0.5 border border-amber-200 shadow-sm">
          {[
            { mode: "edit" as const, icon: "✏️", label: "編集" },
            { mode: "split" as const, icon: "📄", label: "分割" },
            { mode: "preview" as const, icon: "👁", label: "プレビュー" },
          ].map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => setViewMode(item.mode)}
              className={`px-2 py-1 text-xs rounded-md transition ${
                viewMode === item.mode
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-amber-600 hover:bg-amber-100"
              }`}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* OCRエラー表示 */}
      {ocrError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-amber-200 border-t-0 text-red-700 text-xs">
          <span className="flex-1">{ocrError}</span>
          <button
            type="button"
            onClick={() => setOcrError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* エディタ & プレビュー */}
      <div className="flex-1 flex flex-col min-h-0 border border-amber-200 rounded-b-xl overflow-hidden bg-white">
        {/* 画像プレビュー */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 p-2 bg-amber-50/50 border-b border-amber-100 overflow-x-auto shrink-0">
            {imagePreviews.map((preview) => (
              <div key={preview.id} className="relative shrink-0 group">
                <img
                  src={preview.blobUrl}
                  alt="OCR元画像"
                  className="h-20 rounded border border-amber-200 object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeImagePreview(preview.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 rounded-b">
                  OCR元画像
                </span>
              </div>
            ))}
          </div>
        )}

        {/* メインコンテンツエリア */}
        <div className="flex-1 flex min-h-0 relative">
          {/* OCR処理中オーバーレイ */}
          {isOcrProcessing && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-amber-700">
                <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                <span className="text-sm">画像を読み取り中...</span>
              </div>
            </div>
          )}

          {/* 編集エリア */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div
              className={`flex-1 ${viewMode === "split" ? "border-r border-amber-100" : ""}`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-full p-4 text-sm leading-relaxed resize-none focus:outline-none bg-transparent text-amber-900 placeholder-amber-300"
                placeholder={`ここに自由にメモを書こう！

📝 Markdown記法が使えます：
• **太字** や *斜体*
• # 見出し
• - 箇条書き
• $数式$ (LaTeX)

💡 ⌘B: 太字, ⌘I: 斜体, ⌘M: 数式
📷 画像からテキスト抽出もできます`}
              />
            </div>
          )}

          {/* プレビューエリア */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className="flex-1 p-4 overflow-auto bg-gradient-to-br from-amber-50/30 to-orange-50/30">
              {content ? (
                <div className="prose prose-sm max-w-none prose-headings:text-amber-900 prose-p:text-amber-800 prose-strong:text-amber-900 prose-code:text-orange-600 prose-code:bg-orange-50 prose-code:px-1 prose-code:rounded prose-ul:text-amber-800 prose-ol:text-amber-800 prose-blockquote:border-amber-300 prose-blockquote:text-amber-700">
                  {mdast ? (
                    <NodesRenderer nodes={mdast.children} />
                  ) : (
                    <p>{content}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-amber-300">
                  <span className="text-3xl mb-2 block">📝</span>
                  <p>プレビューがここに表示されます</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

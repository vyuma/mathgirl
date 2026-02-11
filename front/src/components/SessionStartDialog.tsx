"use client";

import { useState } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useSessionStore } from "@/stores/sessionStore";

export default function SessionStartDialog({
  onStarted,
}: {
  onStarted?: () => void;
}) {
  const { status } = useSessionStore();
  const { startSession } = useSessionManager();
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  if (status !== "idle") return null;

  const handleStart = async () => {
    console.log(
      "[SessionStartDialog] handleStart called, textContent:",
      textContent,
    );
    setIsLoading(true);
    const sessionId = await startSession(textContent || undefined);
    console.log("[SessionStartDialog] startSession returned:", sessionId);
    setIsLoading(false);
    if (sessionId) {
      onStarted?.();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-gradient-to-t from-black/60 to-transparent sm:bg-black/40">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 w-full sm:max-w-md mx-0 sm:mx-4 shadow-2xl animate-slide-up">
        {/* キャラクターアイコンと挨拶 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-slate-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-4xl text-white">&#10023;</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">...</h2>
          <p className="text-gray-600 text-sm font-medium">
            問いかけよう。答えは自分で見つけるものだ。
          </p>
        </div>

        {/* メインボタン */}
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-slate-700 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-slate-800 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none mb-4"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              準備中...
            </span>
          ) : (
            "始める"
          )}
        </button>

        {/* テキスト入力トグル */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowTextInput(!showTextInput)}
            className="w-full flex items-center justify-between text-gray-600 text-sm hover:text-gray-800 transition"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              学習テキストを追加（任意）
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showTextInput ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showTextInput && (
            <div className="mt-3 animate-fade-in">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="学習したい内容のテキストを貼り付けてください&#10;（例: 教科書の一節、問題文など）"
                className="w-full h-32 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                Markdown記法に対応しています
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

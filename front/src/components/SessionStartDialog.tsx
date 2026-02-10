"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useSessionManager } from "@/hooks/useSessionManager";

export default function SessionStartDialog({
  onStarted,
}: {
  onStarted?: () => void;
}) {
  const { status } = useSessionStore();
  const { startSession } = useSessionManager();
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (status !== "idle") return null;

  const handleStart = async () => {
    setIsLoading(true);
    const sessionId = await startSession(textContent || undefined);
    setIsLoading(false);
    if (sessionId) {
      onStarted?.();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4">新しいセッションを開始</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            学習テキスト（任意）
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="学習したい内容のテキストを貼り付けてください（Markdown対応）"
            className="w-full h-40 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
        >
          {isLoading ? "作成中..." : "セッション開始"}
        </button>
      </div>
    </div>
  );
}

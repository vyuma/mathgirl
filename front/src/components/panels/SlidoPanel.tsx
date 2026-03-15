"use client";

import { useSlidoStore } from "@/stores/slidoStore";
import { useSlideGeneration } from "@/hooks/useSlideGeneration";

export default function SlidoPanel() {
  const { state, html, topic, error, setTopic, reset } = useSlidoStore();
  const { generate } = useSlideGeneration();

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="スライドのテーマ（例: 二次方程式の解き方）"
          disabled={state === "generating"}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder-gray-400"
        />
        <button
          onClick={generate}
          disabled={state === "generating" || !topic.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state === "generating" ? "生成中..." : "生成"}
        </button>
        {state !== "idle" && (
          <button
            onClick={reset}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            リセット
          </button>
        )}
      </div>

      {state === "generating" && (
        <div className="flex items-center justify-center flex-1 text-amber-600 text-sm">
          <span className="animate-pulse">スライドを生成しています...</span>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {state === "ready" && html && (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="flex-1 w-full rounded-lg border border-amber-200"
          title="生成されたスライド"
        />
      )}

      {state === "idle" && (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          テーマを入力してスライドを生成してください
        </div>
      )}
    </div>
  );
}

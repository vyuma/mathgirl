"use client";

import { useCallback } from "react";
import { authFetch } from "@/lib/api/authFetch";
import { useSlidoStore } from "@/stores/slidoStore";
import { useSessionStore } from "@/stores/sessionStore";

export function useSlideGeneration() {
  const { topic, startGenerating, setResult, setError } = useSlidoStore();
  const { sessionId } = useSessionStore();

  const generate = useCallback(async () => {
    if (!topic.trim()) return;

    startGenerating();
    try {
      const res = await authFetch("/api/backend/slides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          session_id: sessionId ?? undefined,
          slide_count: 8,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`スライド生成エラー: ${res.status} ${text}`);
      }

      const data = await res.json();
      setResult(data.slide_id, data.html, data.markdown);
    } catch (e) {
      const message = e instanceof Error ? e.message : "スライド生成に失敗しました";
      setError(message);
    }
  }, [topic, sessionId, startGenerating, setResult, setError]);

  return { generate };
}

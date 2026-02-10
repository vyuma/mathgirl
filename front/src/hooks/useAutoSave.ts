"use client";

import { useEffect, useRef } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { useSessionStore } from "@/stores/sessionStore";

export function useAutoSave(debounceMs = 2000) {
  const { content, isDirty, setDirty } = useNoteStore();
  const { sessionId } = useSessionStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !sessionId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/backend/sessions/${sessionId}/note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setDirty(false);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, isDirty, sessionId, debounceMs, setDirty]);
}

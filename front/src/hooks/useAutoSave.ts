"use client";

import { useEffect, useRef } from "react";
import { useNoteStore } from "@/stores/noteStore";
import { useSessionStore } from "@/stores/sessionStore";

export function useAutoSave(debounceMs = 2000) {
  const { blocks, isDirty, setDirty } = useNoteStore();
  const { sessionId } = useSessionStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !sessionId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      try {
        const contentBlocks = blocks.map((b) => {
          if (b.type === "markdown") {
            return {
              block_id: b.blockId,
              type: "markdown",
              content: b.content,
            };
          }
          return {
            block_id: b.blockId,
            type: "mathlive",
            latex: b.latex,
            mathjson: b.mathjson || null,
          };
        });

        await fetch(`/api/backend/sessions/${sessionId}/note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content_blocks: contentBlocks }),
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
  }, [blocks, isDirty, sessionId, debounceMs, setDirty]);
}

"use client";

import { useCallback } from "react";
import { authFetch } from "@/lib/api/authFetch";
import { useBlackboardStore } from "@/stores/blackboardStore";
import { useDialogStore } from "@/stores/dialogStore";
import { useNoteStore } from "@/stores/noteStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useUnderstandingStore } from "@/stores/understandingStore";
import { useAffinity } from "@/hooks/useAffinity";

export function useSessionManager() {
  const sessionStore = useSessionStore();
  const dialogStore = useDialogStore();
  const noteStore = useNoteStore();
  const blackboardStore = useBlackboardStore();
  const understandingStore = useUnderstandingStore();
  const { fetchAffinity } = useAffinity();

  const startSession = useCallback(
    async (textContent?: string) => {
      console.log(
        "[useSessionManager] startSession called with textContent:",
        textContent,
      );
      sessionStore.setStatus("starting");

      try {
        const res = await authFetch("/api/backend/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text_content: textContent || null }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`[useSessionManager] ${res.status} ${res.statusText}:`, body);
          throw new Error(`Failed to create session: ${res.status}`);
        }

        const data = await res.json();
        console.log(
          "[useSessionManager] Setting session with textContent:",
          textContent || null,
        );
        sessionStore.setSession(data.session_id, textContent || null);

        // Reset other stores
        dialogStore.reset();
        noteStore.reset();
        blackboardStore.clearFormulas();
        understandingStore.reset();

        return data.session_id as string;
      } catch (error) {
        console.error("Failed to start session:", error);
        sessionStore.setStatus("idle");
        return null;
      }
    },
    [sessionStore, dialogStore, noteStore, blackboardStore, understandingStore],
  );

  const endSession = useCallback(async () => {
    if (!sessionStore.sessionId) return;

    try {
      await authFetch(`/api/backend/sessions/${sessionStore.sessionId}/end`, {
        method: "PATCH",
      });
      sessionStore.setStatus("completed");
      await fetchAffinity();
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, [sessionStore, fetchAffinity]);

  const resetSession = useCallback(() => {
    sessionStore.reset();
    dialogStore.reset();
    noteStore.reset();
    blackboardStore.clearFormulas();
    understandingStore.reset();
  }, [
    sessionStore,
    dialogStore,
    noteStore,
    blackboardStore,
    understandingStore,
  ]);

  return {
    sessionId: sessionStore.sessionId,
    status: sessionStore.status,
    textContent: sessionStore.textContent,
    startSession,
    endSession,
    resetSession,
  };
}

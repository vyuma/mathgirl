import { create } from "zustand";

type SessionStatus = "idle" | "starting" | "active" | "completed";

interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  textContent: string | null;
  metaInfo: Record<string, unknown> | null;
  title: string | null;

  setSession: (id: string, textContent?: string | null) => void;
  setMetaInfo: (meta: Record<string, unknown>) => void;
  setStatus: (status: SessionStatus) => void;
  setTitle: (title: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  status: "idle",
  textContent: null,
  metaInfo: null,
  title: null,

  setSession: (id, textContent = null) =>
    set({ sessionId: id, status: "active", textContent }),
  setMetaInfo: (meta) => set({ metaInfo: meta }),
  setStatus: (status) => set({ status }),
  setTitle: (title) => set({ title }),
  reset: () =>
    set({
      sessionId: null,
      status: "idle",
      textContent: null,
      metaInfo: null,
      title: null,
    }),
}));

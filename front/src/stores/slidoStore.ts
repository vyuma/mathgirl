import { create } from "zustand";

type SlidoState = "idle" | "generating" | "ready" | "error";

interface SlidoStore {
  state: SlidoState;
  html: string | null;
  markdown: string | null;
  topic: string;
  slideId: string | null;
  error: string | null;

  setTopic: (topic: string) => void;
  startGenerating: () => void;
  setResult: (slideId: string, html: string, markdown: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useSlidoStore = create<SlidoStore>((set) => ({
  state: "idle",
  html: null,
  markdown: null,
  topic: "",
  slideId: null,
  error: null,

  setTopic: (topic) => set({ topic }),
  startGenerating: () => set({ state: "generating", error: null }),
  setResult: (slideId, html, markdown) =>
    set({ state: "ready", slideId, html, markdown, error: null }),
  setError: (error) => set({ state: "error", error }),
  reset: () =>
    set({ state: "idle", html: null, markdown: null, slideId: null, error: null }),
}));

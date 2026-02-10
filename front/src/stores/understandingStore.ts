import { create } from "zustand";

interface PendingQuestion {
  questionIfCorrect: string;
  questionIfStuck: string;
}

interface UnderstandingState {
  level: number;
  topic: string;
  pendingQuestion: PendingQuestion | null;

  setLevel: (level: number, topic: string) => void;
  setPendingQuestion: (question: PendingQuestion | null) => void;
  reset: () => void;
}

export const useUnderstandingStore = create<UnderstandingState>((set) => ({
  level: 0,
  topic: "",
  pendingQuestion: null,

  setLevel: (level, topic) => set({ level, topic }),
  setPendingQuestion: (question) => set({ pendingQuestion: question }),
  reset: () => set({ level: 0, topic: "", pendingQuestion: null }),
}));

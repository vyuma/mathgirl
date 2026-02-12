import { create } from "zustand";

export interface PendingQuestion {
  questionText: string;
  questionIfCorrect: string;
  questionIfStuck: string;
  visualHintLatex: string | null;
  currentUnderstandingLevel: number;
}

export interface PendingSuggestion {
  latex: string;
  operation: string;
  explanation: string;
}

interface UnderstandingState {
  level: number;
  topic: string;
  pendingQuestion: PendingQuestion | null;
  pendingSuggestion: PendingSuggestion | null;

  setLevel: (level: number, topic: string) => void;
  setPendingQuestion: (question: PendingQuestion | null) => void;
  setSuggestion: (suggestion: PendingSuggestion | null) => void;
  clearSuggestion: () => void;
  reset: () => void;
}

export const useUnderstandingStore = create<UnderstandingState>((set) => ({
  level: 0,
  topic: "",
  pendingQuestion: null,
  pendingSuggestion: null,

  setLevel: (level, topic) => set({ level, topic }),
  setPendingQuestion: (question) => set({ pendingQuestion: question }),
  setSuggestion: (suggestion) => set({ pendingSuggestion: suggestion }),
  clearSuggestion: () => set({ pendingSuggestion: null }),
  reset: () => set({ level: 0, topic: "", pendingQuestion: null, pendingSuggestion: null }),
}));

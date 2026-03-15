import { create } from "zustand";

export type EmotionCategory = "joy" | "thinking" | "confused" | "encouraging" | "neutral";

interface EmotionState {
  emotion: EmotionCategory;
  intensity: number;
  reason: string;
  setEmotion: (emotion: EmotionCategory, intensity: number, reason: string) => void;
  reset: () => void;
}

export const useEmotionStore = create<EmotionState>((set) => ({
  emotion: "neutral",
  intensity: 0,
  reason: "",
  setEmotion: (emotion, intensity, reason) => set({ emotion, intensity, reason }),
  reset: () => set({ emotion: "neutral", intensity: 0, reason: "" }),
}));

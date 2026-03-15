import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Speaker } from "@/lib/tts/useCoeiroink";

interface SpeakerState {
  selectedSpeaker: Speaker | null;
  selectedStyleIndex: number;
  setSpeaker: (speaker: Speaker, styleIndex?: number) => void;
  setStyleIndex: (index: number) => void;
  reset: () => void;
}

export const useSpeakerStore = create<SpeakerState>()(
  persist(
    (set) => ({
      selectedSpeaker: null,
      selectedStyleIndex: 0,
      setSpeaker: (speaker, styleIndex = 0) =>
        set({ selectedSpeaker: speaker, selectedStyleIndex: styleIndex }),
      setStyleIndex: (index) => set({ selectedStyleIndex: index }),
      reset: () => set({ selectedSpeaker: null, selectedStyleIndex: 0 }),
    }),
    { name: "speaker-store" },
  ),
);

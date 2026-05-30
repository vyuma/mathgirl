import { create } from "zustand";

const LEVELS = [
  { level: 1, name: "知り合い", threshold: 0 },
  { level: 2, name: "友達", threshold: 50 },
  { level: 3, name: "仲良し", threshold: 150 },
  { level: 4, name: "親友", threshold: 350 },
  { level: 5, name: "大親友", threshold: 700 },
];

function computeLevel(affinity: number): { level: number; levelName: string } {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (affinity >= l.threshold) current = l;
  }
  return { level: current.level, levelName: current.name };
}

interface AffinityState {
  affinity: number;
  level: number;
  levelName: string;
  gainAnimation: number | null;

  setAffinity: (value: number) => void;
  showGain: (gain: number) => void;
  clearGain: () => void;
}

export const useAffinityStore = create<AffinityState>((set) => ({
  affinity: 0,
  level: 1,
  levelName: "知り合い",
  gainAnimation: null,

  setAffinity: (value) =>
    set({ affinity: value, ...computeLevel(value) }),

  showGain: (gain) => set({ gainAnimation: gain }),

  clearGain: () => set({ gainAnimation: null }),
}));

export { LEVELS };

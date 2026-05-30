import { create } from "zustand";

export type TimerMode  = "teaching" | "pomodoro";
export type TimerPhase = "idle" | "work" | "break" | "paused";

interface TimerConfig {
  teachingMinutes: number;  // teaching モード用（default 25）
  workMinutes: number;      // pomodoro 集中時間（default 25）
  breakMinutes: number;     // pomodoro 休憩時間（default 5）
  cycles: number;           // 0 = 無限（default 4）
  autoStartBreak: boolean;
  autoStartWork: boolean;
}

interface TimerState {
  mode: TimerMode;
  phase: TimerPhase;
  config: TimerConfig;
  currentCycle: number;
  remainingSeconds: number;
  prevPhaseBeforePause: "work" | "break" | null;

  setMode: (mode: TimerMode) => void;
  configure: (partial: Partial<TimerConfig>) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
}

const defaultConfig: TimerConfig = {
  teachingMinutes: 25,
  workMinutes: 25,
  breakMinutes: 5,
  cycles: 4,
  autoStartBreak: true,
  autoStartWork: false,
};

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "teaching",
  phase: "idle",
  config: defaultConfig,
  currentCycle: 1,
  remainingSeconds: defaultConfig.teachingMinutes * 60,
  prevPhaseBeforePause: null,

  setMode: (mode) =>
    set((state) => {
      if (state.phase !== "idle") return {};
      const secs =
        mode === "teaching"
          ? state.config.teachingMinutes * 60
          : state.config.workMinutes * 60;
      return { mode, remainingSeconds: secs };
    }),

  configure: (partial) =>
    set((state) => {
      const newConfig = { ...state.config, ...partial };
      if (state.phase === "idle") {
        const secs =
          state.mode === "teaching"
            ? newConfig.teachingMinutes * 60
            : newConfig.workMinutes * 60;
        return { config: newConfig, remainingSeconds: secs };
      }
      return { config: newConfig };
    }),

  start: () =>
    set((state) => ({
      phase: "work",
      currentCycle: 1,
      remainingSeconds:
        state.mode === "teaching"
          ? state.config.teachingMinutes * 60
          : state.config.workMinutes * 60,
      prevPhaseBeforePause: null,
    })),

  pause: () =>
    set((state) => {
      if (state.phase === "work" || state.phase === "break") {
        return { phase: "paused" as TimerPhase, prevPhaseBeforePause: state.phase };
      }
      return {};
    }),

  resume: () =>
    set((state) => {
      if (state.phase === "paused" && state.prevPhaseBeforePause) {
        return { phase: state.prevPhaseBeforePause as TimerPhase, prevPhaseBeforePause: null };
      }
      return {};
    }),

  reset: () =>
    set((state) => ({
      phase: "idle",
      currentCycle: 1,
      remainingSeconds:
        state.mode === "teaching"
          ? state.config.teachingMinutes * 60
          : state.config.workMinutes * 60,
      prevPhaseBeforePause: null,
    })),

  tick: () =>
    set((state) => {
      if (state.phase !== "work" && state.phase !== "break") return {};

      if (state.remainingSeconds > 0) {
        return { remainingSeconds: state.remainingSeconds - 1 };
      }

      // ── Teaching: 終わったら即 idle ──────────────────────────
      if (state.mode === "teaching") {
        return {
          phase: "idle" as TimerPhase,
          currentCycle: 1,
          remainingSeconds: state.config.teachingMinutes * 60,
          prevPhaseBeforePause: null,
        };
      }

      // ── Pomodoro ─────────────────────────────────────────────
      if (state.phase === "work") {
        if (state.config.autoStartBreak) {
          return { phase: "break" as TimerPhase, remainingSeconds: state.config.breakMinutes * 60 };
        }
        return {
          phase: "paused" as TimerPhase,
          prevPhaseBeforePause: "break" as const,
          remainingSeconds: state.config.breakMinutes * 60,
        };
      }

      // break 終了
      const allCyclesDone =
        state.config.cycles > 0 && state.currentCycle >= state.config.cycles;

      if (allCyclesDone) {
        return {
          phase: "idle" as TimerPhase,
          currentCycle: 1,
          remainingSeconds: state.config.workMinutes * 60,
          prevPhaseBeforePause: null,
        };
      }

      const nextCycle = state.currentCycle + 1;
      if (state.config.autoStartWork) {
        return { phase: "work" as TimerPhase, currentCycle: nextCycle, remainingSeconds: state.config.workMinutes * 60 };
      }
      return {
        phase: "paused" as TimerPhase,
        currentCycle: nextCycle,
        prevPhaseBeforePause: "work" as const,
        remainingSeconds: state.config.workMinutes * 60,
      };
    }),
}));

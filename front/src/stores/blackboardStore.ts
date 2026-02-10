import { create } from "zustand";

export type BlackboardFormula = {
  id: string;
  latex: string;
  explanation: string;
  addedAt: number;
};

interface BlackboardState {
  formulas: BlackboardFormula[];

  addFormula: (latex: string, explanation: string) => void;
  removeFormula: (id: string) => void;
  clearFormulas: () => void;
}

let formulaCounter = 0;

export const useBlackboardStore = create<BlackboardState>((set) => ({
  formulas: [],

  addFormula: (latex, explanation) =>
    set((state) => ({
      formulas: [
        ...state.formulas,
        {
          id: `formula_${Date.now()}_${++formulaCounter}`,
          latex,
          explanation,
          addedAt: Date.now(),
        },
      ],
    })),
  removeFormula: (id) =>
    set((state) => ({
      formulas: state.formulas.filter((f) => f.id !== id),
    })),
  clearFormulas: () => set({ formulas: [] }),
}));

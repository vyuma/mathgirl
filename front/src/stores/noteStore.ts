import { create } from "zustand";

interface NoteState {
  content: string;
  isDirty: boolean;
  viewMode: "edit" | "preview" | "split";

  setContent: (content: string) => void;
  setViewMode: (mode: "edit" | "preview" | "split") => void;
  setDirty: (val: boolean) => void;
  reset: () => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  content: "",
  isDirty: false,
  viewMode: "edit",

  setContent: (content) => set({ content, isDirty: true }),
  setViewMode: (viewMode) => set({ viewMode }),
  setDirty: (val) => set({ isDirty: val }),
  reset: () => set({ content: "", isDirty: false, viewMode: "edit" }),
}));

import { create } from "zustand";

export type NoteBlock =
  | { blockId: string; type: "markdown"; content: string }
  | { blockId: string; type: "mathlive"; latex: string; mathjson?: unknown };

interface NoteState {
  blocks: NoteBlock[];
  isDirty: boolean;
  focusedBlockId: string | null;

  setBlocks: (blocks: NoteBlock[]) => void;
  addBlock: (block: NoteBlock, afterId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<NoteBlock>) => void;
  removeBlock: (blockId: string) => void;
  setFocusedBlock: (blockId: string | null) => void;
  setDirty: (val: boolean) => void;
  reset: () => void;
}

let blockCounter = 0;
export function generateBlockId(): string {
  return `block_${Date.now()}_${++blockCounter}`;
}

export const useNoteStore = create<NoteState>((set) => ({
  blocks: [],
  isDirty: false,
  focusedBlockId: null,

  setBlocks: (blocks) => set({ blocks, isDirty: false }),
  addBlock: (block, afterId) =>
    set((state) => {
      if (!afterId) {
        return { blocks: [...state.blocks, block], isDirty: true };
      }
      const idx = state.blocks.findIndex((b) => b.blockId === afterId);
      const newBlocks = [...state.blocks];
      newBlocks.splice(idx + 1, 0, block);
      return { blocks: newBlocks, isDirty: true };
    }),
  updateBlock: (blockId, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.blockId === blockId ? { ...b, ...updates } : b
      ) as NoteBlock[],
      isDirty: true,
    })),
  removeBlock: (blockId) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.blockId !== blockId),
      isDirty: true,
    })),
  setFocusedBlock: (blockId) => set({ focusedBlockId: blockId }),
  setDirty: (val) => set({ isDirty: val }),
  reset: () =>
    set({ blocks: [], isDirty: false, focusedBlockId: null }),
}));

import { create } from "zustand";

interface ImagePreview {
  id: string;
  blobUrl: string;
}

interface NoteState {
  content: string;
  isDirty: boolean;
  isOcrProcessing: boolean;
  ocrError: string | null;
  imagePreviews: ImagePreview[];

  setContent: (content: string) => void;
  setDirty: (val: boolean) => void;
  setOcrProcessing: (val: boolean) => void;
  setOcrError: (err: string | null) => void;
  addImagePreview: (blobUrl: string) => void;
  removeImagePreview: (id: string) => void;
  reset: () => void;
}

let previewIdCounter = 0;

export const useNoteStore = create<NoteState>((set, get) => ({
  content: "",
  isDirty: false,
  isOcrProcessing: false,
  ocrError: null,
  imagePreviews: [],

  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (val) => set({ isDirty: val }),
  setOcrProcessing: (val) => set({ isOcrProcessing: val }),
  setOcrError: (err) => set({ ocrError: err }),
  addImagePreview: (blobUrl) => {
    const id = `preview-${++previewIdCounter}`;
    set((state) => ({
      imagePreviews: [...state.imagePreviews, { id, blobUrl }],
    }));
  },
  removeImagePreview: (id) => {
    const preview = get().imagePreviews.find((p) => p.id === id);
    if (preview) {
      URL.revokeObjectURL(preview.blobUrl);
    }
    set((state) => ({
      imagePreviews: state.imagePreviews.filter((p) => p.id !== id),
    }));
  },
  reset: () => {
    const { imagePreviews } = get();
    for (const p of imagePreviews) {
      URL.revokeObjectURL(p.blobUrl);
    }
    set({
      content: "",
      isDirty: false,
      isOcrProcessing: false,
      ocrError: null,
      imagePreviews: [],
    });
  },
}));

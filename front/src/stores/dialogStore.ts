import { create } from "zustand";

export type DialogMessage = {
  role: "user" | "assistant";
  content: string;
  contentType?: "text" | "quiz" | "math" | "suggest_operation";
  metadata?: Record<string, unknown>;
};

interface DialogState {
  messages: DialogMessage[];
  streamingText: string;
  isProcessing: boolean;

  addMessage: (msg: DialogMessage) => void;
  setMessages: (msgs: DialogMessage[]) => void;
  setStreamingText: (text: string) => void;
  setIsProcessing: (val: boolean) => void;
  clearStreaming: () => void;
  reset: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  messages: [],
  streamingText: "",
  isProcessing: false,

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setStreamingText: (text) => set({ streamingText: text }),
  setIsProcessing: (val) => set({ isProcessing: val }),
  clearStreaming: () => set({ streamingText: "" }),
  reset: () => set({ messages: [], streamingText: "", isProcessing: false }),
}));

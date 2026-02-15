import { create } from "zustand";

type PanelId = "text" | "note" | "log" | "blackboard";

interface PanelConfig {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelState {
  panels: Record<PanelId, PanelConfig>;
  activeTab: PanelId; // for mobile

  togglePanel: (id: PanelId) => void;
  setActiveTab: (id: PanelId) => void;
  updatePanelPosition: (id: PanelId, x: number, y: number) => void;
  updatePanelSize: (id: PanelId, width: number, height: number) => void;
}

const defaultPanels: Record<PanelId, PanelConfig> = {
  text: { visible: false, x: 20, y: 80, width: 400, height: 500 },
  note: { visible: false, x: 440, y: 80, width: 400, height: 500 },
  log: { visible: false, x: 860, y: 80, width: 350, height: 500 },
  blackboard: { visible: false, x: 440, y: 80, width: 420, height: 400 },
};

export const usePanelStore = create<PanelState>((set) => ({
  panels: defaultPanels,
  activeTab: "log",

  togglePanel: (id) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], visible: !state.panels[id].visible },
      },
    })),
  setActiveTab: (id) => set({ activeTab: id }),
  updatePanelPosition: (id, x, y) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], x, y },
      },
    })),
  updatePanelSize: (id, width, height) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [id]: { ...state.panels[id], width, height },
      },
    })),
}));

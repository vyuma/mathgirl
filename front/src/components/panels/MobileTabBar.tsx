"use client";

import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log" | "blackboard" | "animation" | "slido" | "timer";

const tabs: {
  id: PanelId;
  label: string;
  icon: string;
  activeBg: string;
  activeText: string;
}[] = [
  {
    id: "text",
    label: "テキスト",
    icon: "\u{1F4D6}",
    activeBg: "bg-amber-100",
    activeText: "text-amber-700",
  },
  {
    id: "note",
    label: "ノート",
    icon: "\u{270F}\u{FE0F}",
    activeBg: "bg-yellow-100",
    activeText: "text-yellow-700",
  },
  {
    id: "log",
    label: "おはなし",
    icon: "\u{1F4AC}",
    activeBg: "bg-orange-100",
    activeText: "text-orange-700",
  },
  {
    id: "blackboard",
    label: "数式",
    icon: "\u{1F58B}\u{FE0F}",
    activeBg: "bg-indigo-100",
    activeText: "text-indigo-700",
  },
  {
    id: "animation",
    label: "アニメ",
    icon: "\u{1F3AC}",
    activeBg: "bg-teal-100",
    activeText: "text-teal-700",
  },
  {
    id: "slido",
    label: "スライド",
    icon: "\u{1F4CA}",
    activeBg: "bg-purple-100",
    activeText: "text-purple-700",
  },
  {
    id: "timer",
    label: "タイマー",
    icon: "\u{23F1}\u{FE0F}",
    activeBg: "bg-red-100",
    activeText: "text-red-700",
  },
];

export default function MobileTabBar() {
  const { panels, activeTab, setActiveTab, togglePanel } = usePanelStore();

  const handleTabClick = (id: PanelId) => {
    // If this tab is already active and visible, hide it
    if (activeTab === id && panels[id].visible) {
      togglePanel(id);
      return;
    }

    // Hide all panels, show selected
    for (const tab of tabs) {
      if (tab.id !== id && panels[tab.id].visible) {
        togglePanel(tab.id);
      }
    }
    if (!panels[id].visible) {
      togglePanel(id);
    }
    setActiveTab(id);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex md:hidden border-t border-amber-200/50"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,251,235,0.98) 0%, rgba(254,243,199,0.95) 100%)",
      }}
    >
      {tabs.map(({ id, label, icon, activeBg, activeText }) => {
        const isActive = activeTab === id && panels[id].visible;
        return (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${
              isActive
                ? `${activeText} ${activeBg} rounded-t-xl`
                : "text-amber-400"
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

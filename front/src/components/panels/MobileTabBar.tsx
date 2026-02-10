"use client";

import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log";

const tabs: { id: PanelId; label: string }[] = [
  { id: "text", label: "テキスト" },
  { id: "note", label: "ノート" },
  { id: "log", label: "ログ" },
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
    <div className="absolute bottom-0 left-0 right-0 z-30 flex md:hidden bg-white border-t">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleTabClick(id)}
          className={`flex-1 py-3 text-sm font-medium transition ${
            activeTab === id && panels[id].visible
              ? "text-amber-600 border-t-2 border-amber-500"
              : "text-gray-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

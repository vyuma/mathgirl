"use client";

import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log";

const icons: { id: PanelId; label: string; icon: string }[] = [
  { id: "text", label: "テキスト", icon: "M4 6h16M4 12h16M4 18h10" },
  { id: "note", label: "ノート", icon: "M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2V11M14 4h6v6M10 14L20.5 3.5" },
  { id: "log", label: "ログ", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
];

export default function IconBar() {
  const { panels, togglePanel } = usePanelStore();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-white/90 rounded-full px-4 py-2 shadow-lg md:flex hidden">
      {icons.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => togglePanel(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
            panels[id].visible
              ? "bg-amber-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          title={label}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={icon} />
          </svg>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

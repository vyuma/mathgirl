"use client";

import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log" | "blackboard" | "animation" | "slido" | "timer";

const icons: {
  id: PanelId;
  label: string;
  emoji: string;
  activeClass: string;
}[] = [
  {
    id: "text",
    label: "テキスト",
    emoji: "\u{1F4D6}",
    activeClass: "bg-amber-500 text-white shadow-md",
  },
  {
    id: "note",
    label: "ノート",
    emoji: "\u{270F}\u{FE0F}",
    activeClass: "bg-yellow-500 text-white shadow-md",
  },
  {
    id: "log",
    label: "おはなし",
    emoji: "\u{1F4AC}",
    activeClass: "bg-orange-500 text-white shadow-md",
  },
  {
    id: "blackboard",
    label: "数式",
    emoji: "\u{1F58B}\u{FE0F}",
    activeClass: "bg-indigo-500 text-white shadow-md",
  },
  {
    id: "animation",
    label: "アニメ",
    emoji: "\u{1F3AC}",
    activeClass: "bg-teal-500 text-white shadow-md",
  },
  {
    id: "slido",
    label: "スライド",
    emoji: "\u{1F4CA}",
    activeClass: "bg-purple-500 text-white shadow-md",
  },
  {
    id: "timer",
    label: "タイマー",
    emoji: "\u{23F1}\u{FE0F}",
    activeClass: "bg-red-500 text-white shadow-md",
  },
];

export default function IconBar() {
  const { panels, togglePanel } = usePanelStore();

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 rounded-full px-4 py-2 shadow-lg md:flex hidden border border-amber-200/50"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,251,235,0.95) 0%, rgba(254,243,199,0.92) 100%)",
      }}
    >
      {icons.map(({ id, label, emoji, activeClass }) => (
        <button
          key={id}
          onClick={() => togglePanel(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            panels[id].visible
              ? activeClass
              : "text-amber-600 hover:bg-amber-100/60"
          }`}
          title={label}
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

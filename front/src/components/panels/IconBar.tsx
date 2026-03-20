"use client";

import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log" | "blackboard" | "animation" | "slido";

interface IconConfig {
  id: PanelId;
  label: string;
  emoji: string;
}

const icons: IconConfig[] = [
  { id: "text", label: "テキスト", emoji: "📚" },
  { id: "note", label: "ノート", emoji: "✏️" },
  { id: "log", label: "おはなし", emoji: "💬" },
  { id: "blackboard", label: "数式", emoji: "✒️" },
  { id: "animation", label: "アニメ", emoji: "🎬" },
  { id: "slido", label: "スライド", emoji: "📊" },
];

export default function IconBar() {
  const { panels, togglePanel } = usePanelStore();

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      {/* ツールバーのコンテナ: グラスモルフィズム適用 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/70  backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl md:flex hidden">
        {icons.map(({ id, label, emoji }) => {
          const isActive = panels[id].visible;

          return (
            <button
              key={id}
              onClick={() => togglePanel(id)}
              className={`
                relative group flex flex-col items-center justify-center 
                w-16 h-14 rounded-xl transition-all duration-300
                ${isActive 
                  ? "bg-teal-500 text-white shadow-inner scale-95" 
                  : "hover:bg-teal-500  text-teal-600 hover:-translate-y-1"
                }
              `}
            >
              <span className="text-2xl mb-0.5">{emoji}</span>
              <span className={`text-[10px] font-bold ${isActive ? "text-white" : "text-slate-500"}`}>
                {label}
              </span>

              {/* アクティブ時のインジケーター（下のドット） */}
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-teal-500 rounded-full" />
              )}

              
            </button>
          );
        })}
      </div>
    </div>
  );
}
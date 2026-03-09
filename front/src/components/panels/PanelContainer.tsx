"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log" | "blackboard" | "animation";

const panelConfig: Record<
  PanelId,
  {
    title: string;
    icon: string;
    gradient: string;
    borderColor: string;
    iconBg: string;
    accentColor: string;
  }
> = {
  text: {
    title: "テキスト",
    icon: "📖",
    gradient: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200/60",
    iconBg: "bg-amber-400",
    accentColor: "bg-amber-300",
  },
  note: {
    title: "ノート",
    icon: "✏️",
    gradient: "from-yellow-50 to-amber-50",
    borderColor: "border-yellow-200/60",
    iconBg: "bg-yellow-400",
    accentColor: "bg-yellow-300",
  },
  log: {
    title: "おはなし",
    icon: "💬",
    gradient: "from-orange-50 to-rose-50",
    borderColor: "border-orange-200/60",
    iconBg: "bg-orange-400",
    accentColor: "bg-orange-300",
  },
  blackboard: {
    title: "数式ボード",
    icon: "🖋️",
    gradient: "from-indigo-50 to-violet-50",
    borderColor: "border-indigo-200/60",
    iconBg: "bg-indigo-400",
    accentColor: "bg-indigo-300",
  },
  animation: {
    title: "アニメーション",
    icon: "🎬",
    gradient: "from-teal-50 to-cyan-50",
    borderColor: "border-teal-200/60",
    iconBg: "bg-teal-400",
    accentColor: "bg-teal-300",
  },
};

export default function PanelContainer({
  panel,
  children,
}: {
  panel: PanelId;
  children: ReactNode;
}) {
  const { panels, updatePanelPosition, updatePanelSize } = usePanelStore();
  const config = panels[panel];
  const style = panelConfig[panel];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!config.visible) return null;

  // Mobile: render as full-width panel
  if (isMobile) {
    return (
      <div className="absolute inset-0 top-16 bottom-14 z-20 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-b ${style.gradient} backdrop-blur-sm`}
        >
          {/* Header */}
          <div
            className={`flex items-center gap-3 px-4 py-3 border-b ${style.borderColor} bg-white/50`}
          >
            <div
              className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center`}
              style={{
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.1), 0 0 0 2px rgba(255,255,255,0.4) inset",
              }}
            >
              <span className="text-lg">{style.icon}</span>
            </div>
            <div>
              <span className="font-semibold text-base text-gray-800">
                {style.title}
              </span>
            </div>
          </div>
          {/* Content */}
          <div className="p-4 overflow-auto h-[calc(100%-64px)] bg-white/40">
            {children}
          </div>
          {/* Decorative pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(180,140,80,0.5) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
        </div>
      </div>
    );
  }

  // PC: draggable/resizable panel
  return (
    <Rnd
      position={{ x: config.x, y: config.y }}
      size={{ width: config.width, height: config.height }}
      onDragStop={(_e, d) => updatePanelPosition(panel, d.x, d.y)}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        updatePanelSize(
          panel,
          Number.parseInt(ref.style.width, 10),
          Number.parseInt(ref.style.height, 10),
        );
        updatePanelPosition(panel, position.x, position.y);
      }}
      minWidth={280}
      minHeight={200}
      bounds="parent"
      dragHandleClassName="panel-drag-handle"
      className="z-20"
    >
      <div
        className={`relative flex flex-col h-full rounded-2xl shadow-lg border ${style.borderColor} overflow-hidden`}
        style={{
          background:
            "linear-gradient(145deg, rgba(255,251,235,0.95) 0%, rgba(254,243,199,0.9) 100%)",
          boxShadow:
            "0 4px 20px rgba(180, 140, 80, 0.15), 0 0 0 1px rgba(255,255,255,0.5) inset",
        }}
      >
        {/* Decorative top accent */}
        <div
          className={`h-1 ${style.accentColor}`}
          style={{
            background: `linear-gradient(90deg, transparent, ${style.accentColor}, transparent)`,
          }}
        />

        {/* Header */}
        <div
          className={`panel-drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r ${style.gradient} cursor-move select-none border-b border-amber-100/50`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center shadow-md`}
              style={{
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.1), 0 0 0 2px rgba(255,255,255,0.5) inset",
              }}
            >
              <span className="text-base drop-shadow-sm">{style.icon}</span>
            </div>
            <span className="font-semibold tracking-wide text-gray-800">
              {style.title}
            </span>
          </div>
          <button
            onClick={() => usePanelStore.getState().togglePanel(panel)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow bg-white/70 hover:bg-white text-gray-400 hover:text-gray-600"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-white/60">{children}</div>

        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(180, 140, 80, 0.5) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />
      </div>
    </Rnd>
  );
}

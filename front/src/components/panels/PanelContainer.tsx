"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { usePanelStore } from "@/stores/panelStore";

type PanelId = "text" | "note" | "log";

const panelTitles: Record<PanelId, string> = {
  text: "テキスト",
  note: "ノート",
  log: "対話ログ",
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
      <div className="absolute inset-0 top-16 bottom-14 z-20 bg-white/95 overflow-auto">
        <div className="p-3">{children}</div>
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
          Number.parseInt(ref.style.width),
          Number.parseInt(ref.style.height)
        );
        updatePanelPosition(panel, position.x, position.y);
      }}
      minWidth={280}
      minHeight={200}
      bounds="parent"
      dragHandleClassName="panel-drag-handle"
      className="z-20"
    >
      <div className="flex flex-col h-full bg-white/95 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="panel-drag-handle flex items-center justify-between px-3 py-2 bg-gray-50 border-b cursor-move select-none">
          <span className="text-sm font-medium text-gray-700">
            {panelTitles[panel]}
          </span>
          <button
            onClick={() => usePanelStore.getState().togglePanel(panel)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3">{children}</div>
      </div>
    </Rnd>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import MathField from "./MathField";

interface MathInputDialogProps {
  open: boolean;
  initialValue?: string;
  onCancel: () => void;
  onConfirm: (latex: string) => void;
}

export default function MathInputDialog({
  open,
  initialValue = "",
  onCancel,
  onConfirm,
}: MathInputDialogProps) {
  const [latex, setLatex] = useState(initialValue);

  useEffect(() => {
    if (open) setLatex(initialValue);
  }, [open, initialValue]);

  const handleConfirm = useCallback(() => {
    const trimmed = latex.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  }, [latex, onConfirm, onCancel]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-[90%] max-w-2xl rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-amber-900">数式を入力</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="閉じる"
            className="w-7 h-7 rounded-md text-amber-700 hover:bg-amber-100 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          <MathField
            value={latex}
            onChange={(next) => setLatex(next)}
            className="w-full min-h-[56px]"
          />

          <div className="text-xs text-amber-700/80">
            式を編集して「挿入」を押すと、エディタにLaTeXとして反映されます。
          </div>

          {latex.trim() && (
            <div className="px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-100 font-mono text-xs text-amber-900 break-all">
              ${latex}$
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-white"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!latex.trim()}
            className="px-4 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            挿入
          </button>
        </div>
      </div>
    </div>
  );
}

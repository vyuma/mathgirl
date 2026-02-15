"use client";

import katex from "katex";
import { useEffect, useRef } from "react";
import { useBlackboardStore } from "@/stores/blackboardStore";
import { useNoteStore } from "@/stores/noteStore";

function FormulaCard({
  latex,
  explanation,
  onCopyToNote,
  onDismiss,
}: {
  latex: string;
  explanation: string;
  onCopyToNote: () => void;
  onDismiss: () => void;
}) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mathRef.current) {
      try {
        katex.render(latex, mathRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        mathRef.current.textContent = latex;
      }
    }
  }, [latex]);

  return (
    <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
      <div ref={mathRef} className="text-center mb-2 overflow-x-auto text-gray-900" />
      <p className="text-xs text-gray-500 mb-3">{explanation}</p>
      <div className="flex gap-2">
        <button
          onClick={onCopyToNote}
          className="text-xs px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition shadow-sm"
        >
          ノートにコピー
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function BlackboardPanel() {
  const { formulas, removeFormula } = useBlackboardStore();
  const { content, setContent } = useNoteStore();

  const handleCopyToNote = (latex: string, id: string) => {
    const mathBlock = `\n\n$$${latex}$$\n`;
    setContent(content + mathBlock);
    removeFormula(id);
  };

  if (formulas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <span className="text-3xl">🖋️</span>
        <p className="text-sm text-gray-500">まだ数式がありません</p>
        <p className="text-xs text-gray-400">会話中に数式が出てくるとここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {formulas.map((f) => (
        <FormulaCard
          key={f.id}
          latex={f.latex}
          explanation={f.explanation}
          onCopyToNote={() => handleCopyToNote(f.latex, f.id)}
          onDismiss={() => removeFormula(f.id)}
        />
      ))}
    </div>
  );
}

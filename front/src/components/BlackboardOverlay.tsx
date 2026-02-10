"use client";

import { useBlackboardStore } from "@/stores/blackboardStore";
import { useNoteStore, generateBlockId } from "@/stores/noteStore";
import { useEffect, useRef } from "react";
import katex from "katex";

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
    <div className="bg-gray-900/90 rounded-lg p-3 text-white max-w-sm backdrop-blur-sm">
      <div ref={mathRef} className="text-center mb-2 overflow-x-auto" />
      <p className="text-xs text-gray-300 mb-2">{explanation}</p>
      <div className="flex gap-1">
        <button
          onClick={onCopyToNote}
          className="text-xs px-2 py-1 bg-amber-500/80 rounded hover:bg-amber-500 transition"
        >
          ノートにコピー
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-2 py-1 bg-gray-600 rounded hover:bg-gray-500 transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function BlackboardOverlay() {
  const { formulas, removeFormula } = useBlackboardStore();
  const { addBlock } = useNoteStore();

  if (formulas.length === 0) return null;

  const handleCopyToNote = (latex: string, id: string) => {
    addBlock({
      blockId: generateBlockId(),
      type: "mathlive",
      latex,
    });
    removeFormula(id);
  };

  return (
    <div className="absolute top-20 right-4 z-25 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
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

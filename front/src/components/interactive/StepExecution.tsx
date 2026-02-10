"use client";

import katex from "katex";
import { useEffect, useRef, useState } from "react";

type Step = {
  label: string;
  latex: string;
};

interface StepExecutionProps {
  steps: Step[];
}

function StepDisplay({ step }: { step: Step }) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mathRef.current) {
      try {
        katex.render(step.latex, mathRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        mathRef.current.textContent = step.latex;
      }
    }
  }, [step.latex]);

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs font-medium text-gray-500 min-w-[80px] pt-1">
        {step.label}
      </span>
      <div ref={mathRef} className="flex-1 overflow-x-auto" />
    </div>
  );
}

export default function StepExecution({ steps }: StepExecutionProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  const showNext = () => {
    if (visibleCount < steps.length) {
      setVisibleCount((c) => c + 1);
    }
  };

  const showAll = () => setVisibleCount(steps.length);
  const reset = () => setVisibleCount(1);

  return (
    <div className="my-3 p-3 bg-gray-50 rounded-lg border">
      <div className="divide-y">
        {steps.slice(0, visibleCount).map((step, i) => (
          <StepDisplay key={i} step={step} />
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        {visibleCount < steps.length && (
          <>
            <button
              onClick={showNext}
              className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition"
            >
              次のステップ
            </button>
            <button
              onClick={showAll}
              className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              すべて表示
            </button>
          </>
        )}
        {visibleCount > 1 && (
          <button
            onClick={reset}
            className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            リセット
          </button>
        )}
      </div>
    </div>
  );
}

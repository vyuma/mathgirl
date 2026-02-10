"use client";

import { type MathOperation, performOperation } from "@/lib/math/computeEngine";

const operations: { label: string; op: MathOperation }[] = [
  { label: "展開", op: "expand" },
  { label: "因数分解", op: "factor" },
  { label: "簡約", op: "simplify" },
  { label: "微分", op: "derivative" },
  { label: "積分", op: "integrate" },
];

interface MathOperationBarProps {
  latex: string;
  onResult: (resultLatex: string) => void;
}

export default function MathOperationBar({
  latex,
  onResult,
}: MathOperationBarProps) {
  const handleOperation = (op: MathOperation) => {
    const result = performOperation(latex, op);
    if (result) {
      onResult(result);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {operations.map(({ label, op }) => (
        <button
          key={op}
          onClick={() => handleOperation(op)}
          className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-amber-100 rounded border border-gray-200 transition text-gray-700"
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

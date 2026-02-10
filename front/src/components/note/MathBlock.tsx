"use client";

import { useCallback } from "react";
import MathField from "@/components/math/MathField";
import MathOperationBar from "@/components/math/MathOperationBar";

interface MathBlockProps {
  blockId: string;
  latex: string;
  onChange: (latex: string, mathjson?: unknown) => void;
  onInsertResult: (resultLatex: string) => void;
}

export default function MathBlock({
  blockId,
  latex,
  onChange,
  onInsertResult,
}: MathBlockProps) {
  const handleChange = useCallback(
    (newLatex: string, mathJson?: unknown) => {
      onChange(newLatex, mathJson);
    },
    [onChange]
  );

  return (
    <div className="my-2">
      <MathField value={latex} onChange={handleChange} className="w-full" />
      <MathOperationBar latex={latex} onResult={onInsertResult} />
    </div>
  );
}

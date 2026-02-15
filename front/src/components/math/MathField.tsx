"use client";

import type { MathfieldElement } from "mathlive";
import { useEffect, useRef } from "react";

interface MathFieldProps {
  value?: string;
  readOnly?: boolean;
  onChange?: (latex: string, mathJson?: unknown) => void;
  className?: string;
}

export default function MathField({
  value = "",
  readOnly = false,
  onChange,
  className = "",
}: MathFieldProps) {
  const ref = useRef<MathfieldElement>(null);
  const initialized = useRef(false);

  // Load MathLive dynamically (registers custom element, browser-only)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import("mathlive");
  }, []);

  // Set value programmatically (suppress change notifications to avoid feedback loop)
  useEffect(() => {
    const el = ref.current;
    if (el?.setValue && value !== undefined) {
      if (el.value !== value) {
        el.setValue(value, { silenceNotifications: true });
      }
    }
  }, [value]);

  // Handle input events
  useEffect(() => {
    const el = ref.current;
    if (!el || readOnly || !onChange) return;

    const handleInput = () => {
      const latex = el.value;
      let mathJson: unknown;
      try {
        mathJson = el.getValue("math-json");
      } catch {
        // math-json not available (Compute Engine not loaded)
      }
      onChange(latex, mathJson);
    };

    el.addEventListener("input", handleInput);
    return () => el.removeEventListener("input", handleInput);
  }, [readOnly, onChange]);

  return (
    <math-field
      ref={ref}
      read-only={readOnly || undefined}
      className={`border rounded ${readOnly ? "bg-gray-50" : "bg-white"} ${className}`}
      style={{
        display: "block",
        fontSize: "1.1em",
        padding: readOnly ? "4px 8px" : "8px 12px",
      }}
    />
  );
}

"use client";

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
  const ref = useRef<HTMLElement>(null);
  const initialized = useRef(false);

  // Load MathLive dynamically
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import("mathlive").then(() => {
      // MathLive registers the custom element
    });
  }, []);

  // Set value
  useEffect(() => {
    const el = ref.current as any;
    if (el?.setValue && value !== undefined) {
      const currentValue = el.value;
      if (currentValue !== value) {
        el.setValue(value, { suppressChangeNotifications: true });
      }
    }
  }, [value]);

  // Handle input events
  useEffect(() => {
    const el = ref.current as any;
    if (!el || readOnly || !onChange) return;

    const handleInput = () => {
      const latex = el.value;
      let mathJson;
      try {
        mathJson = el.getValue("math-json");
      } catch {
        // math-json not available
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

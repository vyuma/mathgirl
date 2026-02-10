"use client";

import katex from "katex";
import { useEffect, useRef } from "react";

interface InlineMathMdastNode {
  type: "inlineMath";
  value: string;
}

export default function InlineMathNode({
  node,
}: {
  node: InlineMathMdastNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(node.value, ref.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        ref.current.textContent = node.value;
      }
    }
  }, [node.value]);

  return <span ref={ref} className="inline-block align-middle" />;
}

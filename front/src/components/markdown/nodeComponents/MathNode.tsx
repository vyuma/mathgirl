"use client";

import katex from "katex";
import { useEffect, useRef } from "react";

// remark-math adds math nodes for $$ blocks
interface MathMdastNode {
  type: "math";
  value: string;
}

export default function MathNode({ node }: { node: MathMdastNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(node.value, ref.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        ref.current.textContent = node.value;
      }
    }
  }, [node.value]);

  return <div ref={ref} className="my-3 overflow-x-auto text-center" />;
}

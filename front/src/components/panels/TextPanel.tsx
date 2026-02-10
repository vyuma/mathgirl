"use client";

import { useSessionStore } from "@/stores/sessionStore";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { useMemo } from "react";

export default function TextPanel() {
  const { textContent } = useSessionStore();

  const mdast = useMemo(() => {
    if (!textContent) return null;
    return parseMarkdown(textContent);
  }, [textContent]);

  if (!textContent) {
    return (
      <div className="text-gray-400 text-center py-8">
        テキストが設定されていません
      </div>
    );
  }

  if (!mdast) return null;

  return (
    <div className="prose prose-sm max-w-none">
      <NodesRenderer nodes={mdast.children} />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { useSessionStore } from "@/stores/sessionStore";

export default function TextPanel() {
  const { textContent } = useSessionStore();
  console.log("[TextPanel] textContent from store:", textContent);

  const mdast = useMemo(() => {
    if (!textContent) return null;
    return parseMarkdown(textContent);
  }, [textContent]);

  if (!textContent) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <span className="text-3xl">📚</span>
        </div>
        <p className="text-amber-600 font-medium mb-1">テキストがありません</p>
        <p className="text-amber-400 text-sm">
          セッション開始時にテキストを追加できます
        </p>
      </div>
    );
  }

  if (!mdast) return null;

  return (
    <div className="prose prose-sm max-w-none prose-headings:text-amber-900 prose-p:text-amber-800 prose-strong:text-amber-900 prose-a:text-orange-600">
      <NodesRenderer nodes={mdast.children} />
    </div>
  );
}

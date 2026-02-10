"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { parseMarkdown } from "@/components/markdown/mdastParser";

interface MarkdownBlockProps {
  blockId: string;
  content: string;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (content: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

export default function MarkdownBlock({
  blockId,
  content,
  isFocused,
  onFocus,
  onBlur,
  onChange,
  onEnter,
  onBackspace,
}: MarkdownBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalContent(value);
      onChange(value);
      // Auto-resize
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onEnter();
      }
      if (e.key === "Backspace" && localContent === "") {
        e.preventDefault();
        onBackspace();
      }
    },
    [localContent, onEnter, onBackspace]
  );

  const mdast = useMemo(() => {
    if (isFocused || !content) return null;
    return parseMarkdown(content);
  }, [content, isFocused]);

  if (isFocused) {
    return (
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className="w-full p-2 border border-amber-300 rounded bg-white text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
        rows={1}
        placeholder="Markdownを入力..."
      />
    );
  }

  // Render mode
  if (!content.trim()) {
    return (
      <div
        onClick={onFocus}
        className="p-2 text-gray-300 text-sm cursor-text min-h-[2rem] hover:bg-gray-50 rounded"
      >
        クリックして編集...
      </div>
    );
  }

  return (
    <div
      onClick={onFocus}
      className="p-1 cursor-text min-h-[1.5rem] hover:bg-gray-50 rounded prose prose-sm max-w-none"
    >
      {mdast ? <NodesRenderer nodes={mdast.children} /> : content}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { type DialogMessage, useDialogStore } from "@/stores/dialogStore";
import { useUnderstandingStore } from "@/stores/understandingStore";

function MarkdownContent({ content }: { content: string }) {
  const mdast = useMemo(() => {
    try {
      return parseMarkdown(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!mdast) {
    return <>{content}</>;
  }

  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-code:text-xs">
      <NodesRenderer nodes={mdast.children} />
    </div>
  );
}

function UnderstandingIndicator() {
  const { level, topic } = useUnderstandingStore();
  if (level === 0 && !topic) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
      <span className="text-xs text-slate-400">{topic || "理解度"}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`w-4 h-1.5 rounded-full transition-colors ${
              i < level ? "bg-indigo-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400">Lv{level}</span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: DialogMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {/* アシスタントアイコン */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-sm">&#10023;</span>
        </div>
      )}

      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-md"
            : "bg-white/80 text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-slate-200"
        }`}
      >
        {msg.contentType === "suggest_operation" && msg.metadata ? (
          <div>
            <MarkdownContent content={msg.content} />
            <div className="bg-indigo-50 rounded-lg p-2 text-xs font-mono text-indigo-800 border border-indigo-200 mt-2">
              {String(msg.metadata.latex)}
            </div>
            <span className="text-xs opacity-70 mt-1 block">
              {String(msg.metadata.operation)}
            </span>
          </div>
        ) : (
          <MarkdownContent content={msg.content} />
        )}
      </div>

      {/* ユーザーアイコン */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-sm">
          <span className="text-sm">&#128100;</span>
        </div>
      )}
    </div>
  );
}

export default function DialogLogPanel() {
  const { messages, streamingText } = useDialogStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="space-y-4">
      <UnderstandingIndicator />

      {messages.length === 0 && !streamingText && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-indigo-100 flex items-center justify-center">
            <span className="text-3xl">&#10023;</span>
          </div>
          <p className="text-slate-600 font-medium mb-1">
            問いに問いで返す。それが私のやり方だ。
          </p>
          <p className="text-slate-400 text-sm">
            答えは自分で見つけるものだ
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} />
      ))}

      {streamingText && (
        <div className="flex justify-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-indigo-600 flex items-center justify-center shadow-sm animate-pulse">
            <span className="text-sm">&#10023;</span>
          </div>
          <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/80 text-slate-800 text-sm shadow-sm border border-slate-200">
            <MarkdownContent content={streamingText} />
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 rounded-sm animate-pulse" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

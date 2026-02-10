"use client";

import { useRef, useEffect } from "react";
import { useDialogStore, type DialogMessage } from "@/stores/dialogStore";

function MessageBubble({ msg }: { msg: DialogMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
          isUser
            ? "bg-amber-500 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {msg.contentType === "suggest_operation" && msg.metadata ? (
          <div>
            <p className="mb-1">{msg.content}</p>
            <div className="bg-white/80 rounded p-2 text-xs font-mono">
              {String(msg.metadata.latex)}
            </div>
            <span className="text-xs opacity-70">
              操作: {String(msg.metadata.operation)}
            </span>
          </div>
        ) : (
          msg.content
        )}
      </div>
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
    <div className="space-y-3">
      {messages.length === 0 && !streamingText && (
        <div className="text-gray-400 text-center py-8 text-sm">
          アリスと対話を始めましょう
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} />
      ))}

      {streamingText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm bg-gray-100 text-gray-800 text-sm">
            {streamingText}
            <span className="animate-pulse ml-0.5">|</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

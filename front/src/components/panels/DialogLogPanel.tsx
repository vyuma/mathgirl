"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";
import { type DialogMessage, useDialogStore } from "@/stores/dialogStore";
import katex from "katex";
import {
  type PendingQuestion,
  type PendingSuggestion,
  useUnderstandingStore,
} from "@/stores/understandingStore";

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
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-amber-700 prose-code:bg-amber-50 prose-code:px-1 prose-code:rounded prose-code:text-xs">
      <NodesRenderer nodes={mdast.children} />
    </div>
  );
}

function UnderstandingIndicator() {
  const { level, topic } = useUnderstandingStore();
  if (level === 0 && !topic) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-2">
      <span className="text-xs text-amber-500/70">{topic || "理解度"}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`w-4 h-1.5 rounded-full transition-colors ${
              i < level ? "bg-amber-500" : "bg-amber-200/50"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-amber-500/70">Lv{level}</span>
    </div>
  );
}

function MessageBubble({ msg, userImage }: { msg: DialogMessage; userImage?: string | null }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {/* アシスタントアイコン */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
          <span className="text-sm text-white">&#10023;</span>
        </div>
      )}

      <div
        className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-2xl rounded-br-md shadow-md"
            : "bg-white/90 text-slate-800 rounded-2xl rounded-bl-md shadow-sm border border-amber-200/60"
        }`}
      >
        {msg.contentType === "suggest_operation" && msg.metadata ? (
          <div>
            <MarkdownContent content={msg.content} />
            <div className="bg-amber-50 rounded-lg p-2 text-xs font-mono text-amber-800 border border-amber-200 mt-2">
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full shadow-sm overflow-hidden">
          {userImage ? (
            <img src={userImage} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
              <span className="text-sm">&#128100;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KatexBlock({ latex }: { latex: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        ref.current.textContent = latex;
      }
    }
  }, [latex]);

  return <div ref={ref} className="my-2 overflow-x-auto text-center" />;
}

function SocraticQuestionCard({ question }: { question: PendingQuestion }) {
  const [showHint, setShowHint] = useState(false);

  // Reset hint state when the question changes
  useEffect(() => {
    setShowHint(false);
  }, [question.questionText]);

  return (
    <div className="flex justify-start gap-2">
      {/* ?アイコン */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
        <span className="text-sm font-bold text-white">?</span>
      </div>

      <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-br from-amber-50 to-orange-50 text-slate-800 text-sm shadow-sm border border-amber-200">
        {/* 本文 */}
        <p className="leading-relaxed font-medium text-amber-900">
          {question.questionText}
        </p>

        {/* 数式ヒント */}
        {question.visualHintLatex && (
          <div className="mt-2 p-2 bg-white/60 rounded-lg border border-amber-100">
            <KatexBlock latex={question.visualHintLatex} />
          </div>
        )}

        {/* ヒントボタン + アコーディオン */}
        <button
          type="button"
          onClick={() => setShowHint((prev) => !prev)}
          className="mt-2 text-xs text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1"
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: showHint ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            &#9654;
          </span>
          {showHint ? "ヒントを閉じる" : "ヒントを見る"}
        </button>
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: showHint ? "200px" : "0px",
            opacity: showHint ? 1 : 0,
          }}
        >
          <p className="mt-2 text-xs text-amber-700 leading-relaxed bg-amber-100/50 rounded-lg p-2">
            {question.questionIfStuck}
          </p>
        </div>
      </div>
    </div>
  );
}

const OPERATION_LABELS: Record<string, string> = {
  expand: "展開",
  factor: "因数分解",
  differentiate: "微分",
  integrate: "積分",
  simplify: "整理",
  substitute: "代入",
};

function SuggestOperationCard({ suggestion }: { suggestion: PendingSuggestion }) {
  return (
    <div className="flex justify-start gap-2">
      {/* アイコン */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm">
        <span className="text-sm font-bold text-white">&#9998;</span>
      </div>

      <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-br from-sky-50 to-blue-50 text-slate-800 text-sm shadow-sm border border-sky-200">
        {/* 操作バッジ */}
        <span className="inline-block px-2 py-0.5 mb-2 text-xs font-medium rounded-full bg-sky-100 text-sky-700 border border-sky-200">
          {OPERATION_LABELS[suggestion.operation] || suggestion.operation}
        </span>

        {/* 対象の数式 */}
        <div className="my-2 p-2 bg-white/60 rounded-lg border border-sky-100">
          <KatexBlock latex={suggestion.latex} />
        </div>

        {/* 説明テキスト */}
        <p className="leading-relaxed text-slate-700">
          {suggestion.explanation}
        </p>
      </div>
    </div>
  );
}

export default function DialogLogPanel() {
  const { messages, streamingText } = useDialogStore();
  const { pendingQuestion, pendingSuggestion } = useUnderstandingStore();
  const { data: authSession } = useSession();
  const userImage = authSession?.user?.image;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    // パネル内部のスクロールコンテナのみスクロールし、ページ全体は動かさない
    const scrollContainer = el.closest(".overflow-auto, .overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, streamingText, pendingQuestion, pendingSuggestion]);

  return (
    <div className="space-y-4">
      <UnderstandingIndicator />

      {messages.length === 0 && !streamingText && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <span className="text-3xl">&#10023;</span>
          </div>
          <p className="text-amber-700 font-medium mb-1">
            ここにお話が表示されるよ！
          </p>
          <p className="text-amber-500/70 text-sm">キャラクターとの対話ができるよ</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} msg={msg} userImage={userImage} />
      ))}

      {streamingText && (
        <div className="flex justify-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm animate-pulse">
            <span className="text-sm text-white">&#10023;</span>
          </div>
          <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-white/90 text-slate-800 text-sm shadow-sm border border-amber-200/60">
            <MarkdownContent content={streamingText} />
            <span className="inline-block w-2 h-4 ml-1 bg-amber-400 rounded-sm animate-pulse" />
          </div>
        </div>
      )}

      {pendingQuestion && (
        <SocraticQuestionCard question={pendingQuestion} />
      )}

      {pendingSuggestion && (
        <SuggestOperationCard suggestion={pendingSuggestion} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

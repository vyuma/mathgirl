"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { parseMarkdown } from "@/components/markdown/mdastParser";
import { NodesRenderer } from "@/components/markdown/NodesRenderer";

type MessageItem = {
  message_id: string;
  role: string;
  content: string;
  content_type: string;
  created_at: string;
};

type SessionDetail = {
  session_id: string;
  title: string | null;
  status: string;
  started_at: string;
};

function ChatBubble({ msg }: { msg: MessageItem }) {
  const isUser = msg.role === "user";

  const mdast = useMemo(() => {
    if (!msg.content) return null;
    try {
      return parseMarkdown(msg.content);
    } catch {
      return null;
    }
  }, [msg.content]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 mr-2 flex-shrink-0 mt-1">
          A
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isUser
              ? "bg-amber-500 text-white rounded-br-sm"
              : "bg-white border rounded-bl-sm"
          }`}
        >
          {mdast ? (
            <div className="prose prose-sm max-w-none">
              <NodesRenderer nodes={mdast.children} />
            </div>
          ) : (
            msg.content
          )}
        </div>
        <div
          className={`text-[10px] text-gray-400 mt-0.5 ${isUser ? "text-right" : ""}`}
        >
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          fetch(`/api/backend/sessions/${sessionId}`),
          fetch(`/api/backend/sessions/${sessionId}/messages`),
        ]);

        if (sessionRes.ok) {
          setSession(await sessionRes.json());
        }
        if (messagesRes.ok) {
          setMessages(await messagesRes.json());
        }
      } catch (e) {
        console.error("Failed to fetch session data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.push("/history")}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-sm font-bold">{session?.title || "対話記録"}</h1>
          {session && (
            <span className="text-[10px] text-gray-400">
              {new Date(session.started_at).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">読み込み中...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            メッセージがありません
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.message_id} msg={msg} />)
        )}
      </div>
    </div>
  );
}

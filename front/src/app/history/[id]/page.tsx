"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/api/authFetch";
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

function ChatBubble({ msg, userImage }: { msg: MessageItem; userImage?: string | null }) {
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
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-sm shadow-sm mr-2 flex-shrink-0 mt-1">
          <span className="text-white">&#10023;</span>
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isUser
              ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-br-md shadow-md"
              : "bg-white/90 backdrop-blur-sm text-slate-800 border border-amber-100 rounded-bl-md shadow-sm"
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
          className={`text-[10px] text-amber-400/70 mt-0.5 ${isUser ? "text-right" : ""}`}
        >
          {formatTime(msg.created_at)}
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1 flex items-center justify-center shadow-sm overflow-hidden">
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

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { data: authSession } = useSession();
  const userImage = authSession?.user?.image;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          authFetch(`/api/backend/sessions/${sessionId}`),
          authFetch(`/api/backend/sessions/${sessionId}/messages`),
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
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "url(/images/chat.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-amber-200/50 px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.push("/history")}
          className="p-1 hover:bg-amber-100/60 rounded-lg transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber-700"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-sm font-bold text-amber-900">
            {session?.title || "対話記録"}
          </h1>
          {session && (
            <span className="text-[10px] text-amber-500/70">
              {new Date(session.started_at).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/70 flex items-center justify-center animate-pulse">
              <span className="text-2xl">&#9203;</span>
            </div>
            <p className="text-amber-600/70 text-sm">読み込み中...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/70 flex items-center justify-center">
              <span className="text-3xl">&#128172;</span>
            </div>
            <p className="text-amber-700 font-medium mb-1">
              メッセージがありません
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.message_id} msg={msg} userImage={userImage} />)
        )}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api/authFetch";

type SessionItem = {
  session_id: string;
  title: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await authFetch("/api/backend/sessions");
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (e) {
        console.error("Failed to fetch sessions:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (isToday) return `今日 ${time}`;
    if (isYesterday) return `昨日 ${time}`;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${time}`;
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm("この対話記録を削除しますか？")) return;
    try {
      const res = await authFetch(`/api/backend/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url(/images/chat.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Semi-transparent overlay */}
      <div className="min-h-screen bg-amber-50/40">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-amber-200/50 px-4 py-3 flex items-center gap-3 z-10">
            <button
              onClick={() => router.push("/")}
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
            <h1 className="text-lg font-bold text-amber-900">対話記録</h1>
          </div>

          {/* Session list */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/70 flex items-center justify-center animate-pulse">
                <span className="text-2xl">&#9203;</span>
              </div>
              <p className="text-amber-600/70 text-sm">読み込み中...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/70 flex items-center justify-center">
                <span className="text-3xl">&#128172;</span>
              </div>
              <p className="text-amber-700 font-medium mb-1">
                まだ対話記録がありません
              </p>
              <p className="text-amber-500/70 text-sm">
                セッションを始めてみましょう
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  onClick={() => router.push(`/history/${session.session_id}`)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-white/85 rounded-2xl shadow-sm hover:shadow-md text-left transition-all duration-200 hover:bg-white/95 cursor-pointer"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-medium text-sm text-amber-900 truncate">
                      {session.title || "無題のセッション"}
                    </div>
                    <div className="text-xs text-amber-500/70 mt-0.5">
                      {formatDate(session.started_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        session.status === "active"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {session.status === "active" ? "進行中" : "完了"}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, session.session_id)}
                      className="p-1.5 rounded-lg text-amber-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="削除"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-amber-300"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

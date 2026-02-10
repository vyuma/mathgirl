"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
        const res = await fetch("/api/backend/sessions");
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
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
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
          <h1 className="text-lg font-bold">対話記録</h1>
        </div>

        {/* Session list */}
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            まだ対話記録がありません
          </div>
        ) : (
          <div className="divide-y">
            {sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => router.push(`/history/${session.session_id}`)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left transition"
              >
                <div>
                  <div className="font-medium text-sm">
                    {session.title || "無題のセッション"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(session.started_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      session.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {session.status === "active" ? "進行中" : "完了"}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

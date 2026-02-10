"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionManager } from "@/hooks/useSessionManager";

export default function TopBar() {
  const router = useRouter();
  const { status, endSession, resetSession } = useSessionManager();
  const [showMenu, setShowMenu] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleEnd = async () => {
    await endSession();
    resetSession();
    setShowEndConfirm(false);
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        {status === "active" && (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-3 py-1.5 bg-white/90 rounded-lg shadow text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            終了
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 bg-white/90 rounded-lg shadow hover:bg-white transition"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  router.push("/history");
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                対話記録
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 終了確認ダイアログ */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2">対話を終了しますか？</h3>
            <p className="text-sm text-gray-600 mb-4">
              対話記録は自動的に保存されます。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleEnd}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

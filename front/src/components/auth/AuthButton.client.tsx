"use client";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "@/auth/helpers";

export default function AuthButton() {
  const session = useSession();

  if (session?.data?.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full shadow-sm text-sm text-gray-600">
          <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
            {session.data.user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
          <span className="font-medium">{session.data.user.name}</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full shadow-sm text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition"
          onClick={async () => await signOut()}
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
            <title>Logout</title>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 border border-gray-200 hover:border-amber-300 transition"
      onClick={async () => await signIn()}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Login</title>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Login
    </button>
  );
}

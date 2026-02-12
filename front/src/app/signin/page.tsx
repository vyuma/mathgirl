"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/talk";

  return (
    <div className="min-h-screen bg-linear-to-br from-pink-50 via-fuchsia-50/30 to-purple-50 flex items-center justify-center px-4">
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-fuchsia-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/5 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />

        {/* 浮遊パーティクル */}
        <span className="absolute top-[15%] left-[10%] text-pink-300/60 text-2xl animate-float-slow">
          ✦
        </span>
        <span className="absolute top-[25%] right-[15%] text-fuchsia-300/50 text-lg animate-float-medium animation-delay-1">
          ✧
        </span>
        <span className="absolute top-[60%] left-[20%] text-rose-300/50 text-xl animate-float-medium animation-delay-2">
          ♡
        </span>
        <span className="absolute top-[45%] right-[10%] text-purple-300/50 text-2xl animate-float-slow animation-delay-1">
          ✿
        </span>
        <span className="absolute top-[75%] left-[70%] text-pink-300/40 text-lg animate-float-slow animation-delay-3">
          ✦
        </span>
        <span className="absolute top-[35%] left-[80%] text-fuchsia-300/40 text-xl animate-float-medium animation-delay-2">
          ✧
        </span>
      </div>

      {/* サインインカード */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="kawaii-card bg-white/80 backdrop-blur-sm border border-pink-100 rounded-3xl shadow-lg p-8 flex flex-col items-center text-center">
          {/* ロゴ */}
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Math
            <span className="bg-linear-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
              Girl
            </span>
          </h1>

          <p className="text-sm text-gray-500 mb-8">
            ログインして学習をはじめよう
          </p>

          {/* Google ログインボタン */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-linear-to-r from-pink-400 to-fuchsia-400 text-white font-semibold rounded-full shadow-lg shadow-pink-400/25 hover:shadow-pink-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#fff"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#fff"
                fillOpacity="0.9"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#fff"
                fillOpacity="0.8"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#fff"
                fillOpacity="0.7"
              />
            </svg>
            Google でログイン
          </button>

          {/* ホームに戻る */}
          <Link
            href="/"
            className="mt-6 text-sm text-pink-400 hover:text-pink-500 transition-colors"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}

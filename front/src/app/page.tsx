import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-pink-50 via-fuchsia-50/30 to-purple-50">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* 背景装飾 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-fuchsia-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/5 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl" />
          <div className="absolute top-2/3 right-1/3 w-48 h-48 bg-violet-200/20 rounded-full blur-3xl" />

          {/* 浮遊パーティクル */}
          <span className="absolute top-[15%] left-[10%] text-pink-300/60 text-2xl animate-float-slow">✦</span>
          <span className="absolute top-[25%] right-[15%] text-fuchsia-300/50 text-lg animate-float-medium animation-delay-1">✧</span>
          <span className="absolute top-[60%] left-[20%] text-rose-300/50 text-xl animate-float-medium animation-delay-2">♡</span>
          <span className="absolute top-[45%] right-[10%] text-purple-300/50 text-2xl animate-float-slow animation-delay-1">✿</span>
          <span className="absolute top-[75%] left-[70%] text-pink-300/40 text-lg animate-float-slow animation-delay-3">✦</span>
          <span className="absolute top-[35%] left-[80%] text-fuchsia-300/40 text-xl animate-float-medium animation-delay-2">✧</span>
          <span className="absolute top-[80%] left-[40%] text-rose-300/50 text-lg animate-float-slow animation-delay-1">♡</span>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-sm font-semibold tracking-widest text-pink-400 uppercase mb-4">
            <span className="animate-sparkle inline-block text-pink-300">✦</span>
            {" "}AI Math Tutor{" "}
            <span className="animate-sparkle inline-block animation-delay-1 text-pink-300">✦</span>
          </p>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Math<span className="bg-linear-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">Girl</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-10">
            AIキャラクターと一緒に、対話しながら数学を学ぼう。
            <br className="hidden sm:block" />
            音声・手書き・数式入力に対応した新しい学習体験。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/talk"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-linear-to-r from-pink-400 to-fuchsia-400 text-white text-base font-semibold rounded-full shadow-lg shadow-pink-400/25 hover:shadow-pink-400/40 hover:scale-105 active:scale-95 transition-all animate-pulse-soft"
            >
              対話をはじめる
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
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/80 text-pink-500 text-base font-semibold rounded-full border border-pink-200 shadow hover:bg-pink-50 hover:scale-105 transition-all"
            >
              対話記録を見る
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
            <span className="text-pink-300">✿</span> 特徴 <span className="text-pink-300">✿</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <FeatureCard
              accentColor="pink"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              }
              title="音声対話"
              description="マイクで話しかけるだけ。AIが音声で丁寧に解説してくれます。"
            />
            <FeatureCard
              accentColor="purple"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="9" y1="7" x2="15" y2="7" />
                  <line x1="9" y1="11" x2="13" y2="11" />
                </svg>
              }
              title="ノート & 数式"
              description="数式エディタで自分の考えを入力。手書きのように自由に書けます。"
            />
            <FeatureCard
              accentColor="fuchsia"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
              title="黒板で解説"
              description="AIキャラクターが黒板を使って、数式やグラフをわかりやすく説明。"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-pink-400">
        <span className="text-pink-300">♡</span> MathGirl &copy; {new Date().getFullYear()} <span className="text-pink-300">♡</span>
      </footer>
    </div>
  );
}

const accentStyles = {
  pink: {
    bg: "bg-linear-to-br from-pink-50 to-white",
    border: "border-pink-100",
    iconBg: "bg-pink-50",
    iconText: "text-pink-400",
  },
  purple: {
    bg: "bg-linear-to-br from-purple-50 to-white",
    border: "border-purple-100",
    iconBg: "bg-purple-50",
    iconText: "text-purple-400",
  },
  fuchsia: {
    bg: "bg-linear-to-br from-fuchsia-50 to-white",
    border: "border-fuchsia-100",
    iconBg: "bg-fuchsia-50",
    iconText: "text-fuchsia-400",
  },
} as const;

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: keyof typeof accentStyles;
}) {
  const style = accentStyles[accentColor];
  return (
    <div className={`kawaii-card flex flex-col items-center text-center p-8 ${style.bg} border ${style.border} rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
      <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${style.iconBg} ${style.iconText} mb-5`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

"use client";

import { useTimerStore } from "@/stores/timerStore";
import type { TimerMode } from "@/stores/timerStore";

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── テーマ ──────────────────────────────────────────────────────────
const PHASE_THEME = {
  work: {
    ring: "#f43f5e", ringLight: "#fda4af", glow: "rgba(244,63,94,0.22)",
    label: "🎯 集中中",
    labelBg: "bg-rose-500/20 border-rose-400/40 text-rose-600",
    timeColor: "text-rose-600",
    btnPrimary: "bg-rose-500 hover:bg-rose-600 border-rose-400 text-white",
    btnSecondary: "bg-rose-100/60 hover:bg-rose-200/70 border-rose-300/50 text-rose-500",
    dot: "#f43f5e",
  },
  break: {
    ring: "#10b981", ringLight: "#6ee7b7", glow: "rgba(16,185,129,0.22)",
    label: "☕ 休憩中",
    labelBg: "bg-emerald-500/20 border-emerald-400/40 text-emerald-600",
    timeColor: "text-emerald-600",
    btnPrimary: "bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white",
    btnSecondary: "bg-emerald-100/60 hover:bg-emerald-200/70 border-emerald-300/50 text-emerald-500",
    dot: "#10b981",
  },
  paused: {
    ring: "#f59e0b", ringLight: "#fcd34d", glow: "rgba(245,158,11,0.22)",
    label: "⏸ 一時停止",
    labelBg: "bg-amber-500/20 border-amber-400/40 text-amber-600",
    timeColor: "text-amber-600",
    btnPrimary: "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white",
    btnSecondary: "bg-amber-100/60 hover:bg-amber-200/70 border-amber-300/50 text-amber-500",
    dot: "#f59e0b",
  },
  idle: {
    ring: "#8b5cf6", ringLight: "#c4b5fd", glow: "rgba(139,92,246,0.22)",
    label: "",  // モード別に上書き
    labelBg: "bg-violet-500/20 border-violet-400/40 text-violet-600",
    timeColor: "text-violet-600",
    btnPrimary: "bg-violet-500 hover:bg-violet-600 border-violet-400 text-white",
    btnSecondary: "bg-violet-100/60 hover:bg-violet-200/70 border-violet-300/50 text-violet-500",
    dot: "#8b5cf6",
  },
};

const MODE_META: Record<TimerMode, { label: string; idleLabel: string; ringColor: string }> = {
  teaching: { label: "📖 授業タイマー", idleLabel: "📖 授業タイマー",  ringColor: "#6366f1" },
  pomodoro: { label: "🍅 ポモドーロ",   idleLabel: "🍅 ポモドーロ",    ringColor: "#f43f5e" },
};

// ── サブコンポーネント ───────────────────────────────────────────────
function TriBtn({ sign, color, disabled, onClick }: {
  sign: "+" | "-"; color: string; disabled?: boolean; onClick: () => void;
}) {
  const points = sign === "+" ? "3,14 3,2 15,8" : "15,2 15,14 3,8";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-lg active:scale-90 ${disabled ? "opacity-25 cursor-not-allowed" : "hover:scale-105"}`}>
      <svg width="18" height="16" viewBox="0 0 18 16" className="overflow-visible">
        <polygon points={points}
          fill={disabled ? "#d1d5db" : color} fillOpacity={0.85}
          stroke={disabled ? "#d1d5db" : color} strokeWidth="1" strokeLinejoin="round"
          style={{ filter: disabled ? "none" : `drop-shadow(0 1px 3px ${color}66)` }} />
        <text x="9" y="11" textAnchor="middle" fontSize="8" fontWeight="900" fill="white"
          style={{ userSelect: "none" }}>{sign}</text>
      </svg>
    </button>
  );
}

function StepRow({ label, value, min, max, step, color, onChange }: {
  label: string; value: number; min: number; max: number; step: number; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-gray-600 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <TriBtn sign="-" color={color} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} />
        <span className="w-9 text-center text-sm font-bold tabular-nums rounded-lg py-0.5"
          style={{ color, background: `${color}15` }}>{value}</span>
        <TriBtn sign="+" color={color} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} />
      </div>
    </div>
  );
}

function Toggle({ on, color, onChange }: { on: boolean; color: string; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full relative transition-all duration-300 border"
      style={{ background: on ? color : "rgba(209,213,219,0.5)", borderColor: on ? color : "rgba(209,213,219,0.6)", boxShadow: on ? `0 0 8px ${color}44` : "none" }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: on ? "calc(100% - 1.375rem)" : "2px" }} />
    </button>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────────
export default function TimerPanel() {
  const { mode, phase, config, currentCycle, remainingSeconds, setMode, configure, start, pause, resume, reset } =
    useTimerStore();

  const t = PHASE_THEME[phase];
  const meta = MODE_META[mode];

  // idle のバッジテキストをモードで差し替え
  const badgeLabel = phase === "idle" ? meta.idleLabel : t.label;
  const badgeBg    = phase === "idle"
    ? (mode === "teaching"
        ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-600"
        : "bg-rose-500/20 border-rose-400/40 text-rose-600")
    : t.labelBg;

  const totalSeconds = phase === "break" ? config.breakMinutes * 60
    : mode === "teaching" ? config.teachingMinutes * 60
    : config.workMinutes * 60;

  const progress   = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const tipAngle   = progress * 2 * Math.PI - Math.PI / 2;
  const tipX       = 68 + RADIUS * Math.cos(tipAngle);
  const tipY       = 68 + RADIUS * Math.sin(tipAngle);
  const ringColor  = phase === "idle" ? meta.ringColor : t.ring;

  const isRunning = phase === "work" || phase === "break";

  return (
    <div className="flex flex-col items-center gap-3 py-1 select-none">

      {/* ── モード切り替えタブ（idle 時のみ） ── */}
      {phase === "idle" && (
        <div className="flex w-full rounded-xl overflow-hidden border border-gray-200/60 bg-white/20 backdrop-blur-sm">
          {(["teaching", "pomodoro"] as TimerMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs font-bold transition-all duration-200 ${
                mode === m
                  ? m === "teaching"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-rose-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}>
              {MODE_META[m].label}
            </button>
          ))}
        </div>
      )}

      {/* ── フェーズバッジ ── */}
      <div className={`px-4 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${badgeBg}`}>
        {badgeLabel}
      </div>

      {/* ── リング ── */}
      <div className="relative flex items-center justify-center">
        <div className="absolute rounded-full pointer-events-none" style={{
          width: 148, height: 148,
          background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`,
        }} />

        <svg width="148" height="148" viewBox="0 0 136 136">
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
            const r0 = RADIUS + 9, r1 = RADIUS + (i % 5 === 0 ? 14 : 11);
            return (
              <line key={i}
                x1={68 + r0 * Math.cos(a)} y1={68 + r0 * Math.sin(a)}
                x2={68 + r1 * Math.cos(a)} y2={68 + r1 * Math.sin(a)}
                stroke={ringColor} strokeWidth={i % 5 === 0 ? 1.8 : 0.8}
                opacity={i % 5 === 0 ? 0.4 : 0.15} />
            );
          })}
          <circle cx="68" cy="68" r={RADIUS} fill="none" stroke={ringColor} strokeWidth="9" opacity={0.15} />
          <circle cx="68" cy="68" r={RADIUS} fill="none" stroke={ringColor} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            transform="rotate(-90 68 68)"
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${ringColor}88)` }} />
          {isRunning && progress > 0.01 && (
            <circle cx={tipX} cy={tipY} r={5.5} fill={ringColor}
              style={{ filter: `drop-shadow(0 0 5px ${ringColor})` }} />
          )}
        </svg>

        <div className="absolute flex flex-col items-center gap-1.5">
          <span className={`text-[2.2rem] font-black font-mono tabular-nums leading-none ${t.timeColor}`}
            style={{ textShadow: `0 2px 12px ${ringColor}44`, color: ringColor }}>
            {formatTime(remainingSeconds)}
          </span>

          {/* サイクルドット（pomodoro のみ） */}
          {mode === "pomodoro" && (
            config.cycles > 0 ? (
              <div className="flex gap-1.5">
                {Array.from({ length: config.cycles }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{
                      background: i < currentCycle ? t.dot : "rgba(0,0,0,0.1)",
                      boxShadow: i < currentCycle ? `0 0 4px ${t.dot}88` : "none",
                      transform: i < currentCycle ? "scale(1.2)" : "scale(1)",
                    }} />
                ))}
              </div>
            ) : <span className="text-xs text-gray-400">∞</span>
          )}
        </div>
      </div>

      {/* サイクル表示 */}
      {mode === "pomodoro" && config.cycles > 0 && phase !== "idle" && (
        <p className="text-xs font-medium" style={{ color: t.ring, opacity: 0.75 }}>
          {currentCycle} / {config.cycles} サイクル
        </p>
      )}

      {/* ── ボタン ── */}
      <div className="flex gap-2 items-center">
        {phase === "idle" && (
          <button onClick={start}
            className={`px-6 py-2 rounded-full text-sm font-bold border shadow-md transition-all duration-200 active:scale-95 ${t.btnPrimary}`}
            style={{ background: ringColor, borderColor: ringColor }}>
            ▶ スタート
          </button>
        )}
        {isRunning && (
          <button onClick={pause}
            className={`px-5 py-2 rounded-full text-sm font-bold border shadow-sm backdrop-blur-sm transition-all duration-200 active:scale-95 ${t.btnSecondary}`}>
            ⏸ 止める
          </button>
        )}
        {phase === "paused" && (
          <button onClick={resume}
            className={`px-6 py-2 rounded-full text-sm font-bold border shadow-md transition-all duration-200 active:scale-95 ${t.btnPrimary}`}>
            ▶ 再開
          </button>
        )}
        {phase !== "idle" && (
          <button onClick={reset}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs border border-gray-300/50 bg-white/30 backdrop-blur-sm hover:bg-gray-100/50 text-gray-400 transition-all duration-200 active:scale-95">
            ✕
          </button>
        )}
      </div>

      {/* ── 設定（idle 時のみ） ── */}
      {phase === "idle" && (
        <div className="w-full pt-3 border-t border-black/8 flex flex-col gap-3 px-0.5">

          {mode === "teaching" ? (
            /* 授業タイマー設定: 時間のみ */
            <StepRow label="⏱ 授業時間（分）" value={config.teachingMinutes} min={1} max={120} step={5}
              color="#6366f1" onChange={(v) => configure({ teachingMinutes: v })} />
          ) : (
            /* ポモドーロ設定 */
            <>
              <StepRow label="🍅 集中時間（分）" value={config.workMinutes} min={1} max={120} step={5}
                color="#f43f5e" onChange={(v) => configure({ workMinutes: v })} />
              <StepRow label="☕ 休憩時間（分）" value={config.breakMinutes} min={1} max={60} step={1}
                color="#10b981" onChange={(v) => configure({ breakMinutes: v })} />
              <StepRow label="🔁 サイクル数（0=∞）" value={config.cycles} min={0} max={20} step={1}
                color="#8b5cf6" onChange={(v) => configure({ cycles: v })} />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-medium text-gray-600">☕ 休憩を自動開始</span>
                <Toggle on={config.autoStartBreak} color="#10b981" onChange={(v) => configure({ autoStartBreak: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-600">🍅 作業を自動開始</span>
                <Toggle on={config.autoStartWork} color="#f43f5e" onChange={(v) => configure({ autoStartWork: v })} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

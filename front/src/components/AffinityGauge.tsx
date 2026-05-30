"use client";

import { useEffect, useRef, useState } from "react";
import { useAffinityStore, LEVELS } from "@/stores/affinityStore";

export default function AffinityGauge() {
  const affinity    = useAffinityStore((s) => s.affinity);
  const level       = useAffinityStore((s) => s.level);
  const levelName   = useAffinityStore((s) => s.levelName);
  const gainAnimation = useAffinityStore((s) => s.gainAnimation);
  const clearGain   = useAffinityStore((s) => s.clearGain);

  // level-up flash
  const prevLevelRef = useRef(level);
  const [levelUp, setLevelUp] = useState(false);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelUp(true);
      setTimeout(() => setLevelUp(false), 2000);
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (gainAnimation === null) return;
    const t = setTimeout(clearGain, 2500);
    return () => clearTimeout(t);
  }, [gainAnimation, clearGain]);

  const currentThreshold = LEVELS[level - 1]?.threshold ?? 0;
  const nextLevel        = LEVELS[level];
  const nextThreshold    = nextLevel?.threshold ?? currentThreshold;
  const progressPct      = nextLevel
    ? Math.min(((affinity - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100)
    : 100;

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm shadow-sm border border-pink-100">
      {/* Level badge */}
      <span className={`text-xs font-bold whitespace-nowrap transition-all duration-300 ${
        levelUp ? "text-pink-600 scale-110" : "text-pink-500"
      }`}>
        ♥ Lv.{level}
        <span className="ml-1 font-medium text-pink-400">{levelName}</span>
      </span>

      {/* Progress bar */}
      <div className="w-20 h-2 bg-pink-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
            boxShadow: "0 0 4px rgba(236,72,153,0.4)",
          }}
        />
      </div>

      {/* Gain popup */}
      {gainAnimation !== null && (
        <span
          key={gainAnimation}
          className="absolute -top-6 right-2 text-sm font-black text-pink-500 animate-bounce drop-shadow"
          style={{ textShadow: "0 0 8px rgba(236,72,153,0.5)" }}
        >
          +{gainAnimation} ♥
        </span>
      )}

      {/* Level-up flash */}
      {levelUp && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-black text-pink-600 whitespace-nowrap animate-ping">
          ✨ レベルアップ！
        </span>
      )}
    </div>
  );
}

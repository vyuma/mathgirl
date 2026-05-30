"use client";

import { useEffect, useRef } from "react";
import { useTimerStore } from "@/stores/timerStore";
import { useAffinity } from "@/hooks/useAffinity";

const AFFINITY_PER_CYCLE    = 15;
const AFFINITY_ALL_DONE     = 30;
const AFFINITY_TEACHING_END = 20;

export function useTimerController(onAnnounce: (msg: string) => void) {
  const phase = useTimerStore((s) => s.phase);
  const mode  = useTimerStore((s) => s.mode);
  const tick  = useTimerStore((s) => s.tick);
  const { addAffinity } = useAffinity();

  const prevPhaseRef   = useRef(phase);
  const prevModeRef    = useRef(mode);
  const onAnnounceRef  = useRef(onAnnounce);
  const addAffinityRef = useRef(addAffinity);
  onAnnounceRef.current  = onAnnounce;
  addAffinityRef.current = addAffinity;

  // 毎秒 tick
  useEffect(() => {
    if (phase !== "work" && phase !== "break") return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  // フェーズ変化 → アナウンス & 親密度
  useEffect(() => {
    const prev     = prevPhaseRef.current;
    const prevMode = prevModeRef.current;
    prevPhaseRef.current  = phase;
    prevModeRef.current   = mode;

    // ── Teaching: タイマー終了（work → idle）──────────────────
    if (prevMode === "teaching" && prev === "work" && phase === "idle") {
      addAffinityRef.current(AFFINITY_TEACHING_END);
      onAnnounceRef.current(
        "（授業タイマーが終了しました！25分間よく集中できましたね。ひとこと褒めつつ、お疲れ様を伝えてください。）"
      );
      return;
    }

    // ── Pomodoro ─────────────────────────────────────────────
    if (prevMode === "pomodoro") {
      if (prev === "work" && phase === "break") {
        addAffinityRef.current(AFFINITY_PER_CYCLE);
        onAnnounceRef.current(
          "（ポモドーロの集中タイムが終わりました！すごく頑張ったので、思いっきり褒めてお疲れ様を言いながら休憩を勧めてください。少し感情豊かに、でも短くまとめて。）"
        );
      } else if (prev === "break" && phase === "work") {
        onAnnounceRef.current(
          "（休憩が終わりました。元気よく次の集中タイムの開始を告げてください。一言で気合いを入れて！）"
        );
      } else if (prev !== "idle" && phase === "idle") {
        addAffinityRef.current(AFFINITY_ALL_DONE);
        onAnnounceRef.current(
          "（全ポモドーロサイクルを完走しました！これは本当にすごいことなので、最大限に褒めちぎって、一緒に頑張れた嬉しさを素直に伝えてください。少し長めでOK！）"
        );
      }
    }
  }, [phase, mode]);
}

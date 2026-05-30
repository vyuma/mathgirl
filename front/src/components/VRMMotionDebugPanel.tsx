"use client";

import { type RefObject } from "react";
import { type MotionName } from "@/lib/vrmMotions";
import { type ExpressionName } from "@/lib/vrmExpressions";
import { type VRMChatHandle } from "@/components/VRMChat";

type Props = {
  vrmRef: RefObject<VRMChatHandle | null>;
};

const MOTIONS: { name: MotionName; label: string }[] = [
  { name: "headTiltLeft", label: "首かしげ（左）" },
  { name: "headTiltRight", label: "首かしげ（右）" },
  { name: "nod", label: "うなずく" },
  { name: "think", label: "考える" },
];

const EXPRESSIONS: { name: ExpressionName; label: string }[] = [
  { name: "smile", label: "🙂 微笑み" },
  { name: "happy", label: "😊 喜び" },
  { name: "sad", label: "😢 悲しみ" },
  { name: "angry", label: "😠 怒り" },
  { name: "surprised", label: "😲 驚き" },
  { name: "relaxed", label: "😌 穏やか" },
];

// public/animations/ に置いた .vrma ファイルをここに追加する
const VRMA_FILES: { url: string; label: string; loop?: boolean }[] = [
  // 例: { url: "/animations/idle.vrma", label: "待機", loop: false },
    { url: "/animations/ice.vrma", label: "ダンス", loop: false },
    { url: "/animations/VRMA_01.vrma", label: "全身を見せる", loop: false },
    { url: "/animations/VRMA_02.vrma", label: "挨拶", loop: false },
    { url: "/animations/VRMA_03.vrma", label: "Vサイン", loop: false },
    { url: "/animations/VRMA_04.vrma", label: "撃つ", loop: false },
    { url: "/animations/VRMA_05.vrma", label: "回る", loop: false },
    { url: "/animations/VRMA_06.vrma", label: "モデルポーズ", loop: false },
    { url: "/animations/VRMA_07.vrma", label: "屈伸運動", loop: false },
];

export default function VRMMotionDebugPanel({ vrmRef }: Props) {
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 rounded-xl bg-black/60 p-3 backdrop-blur-sm w-44">
      <p className="text-xs text-white/60 text-center">手書きモーション</p>
      {MOTIONS.map(({ name, label }) => (
        <button
          key={name}
          onClick={() => vrmRef.current?.playMotion(name)}
          className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 active:scale-95 transition-all"
        >
          {label}
        </button>
      ))}

      <p className="text-xs text-white/60 text-center mt-1">表情</p>
      {EXPRESSIONS.map(({ name, label }) => (
        <button
          key={name}
          onClick={() => vrmRef.current?.playExpression(name)}
          className="rounded-lg bg-pink-500/40 px-4 py-2 text-sm text-white hover:bg-pink-500/60 active:scale-95 transition-all"
        >
          {label}
        </button>
      ))}
      <button
        onClick={() => vrmRef.current?.clearExpression()}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20 active:scale-95 transition-all"
      >
        表情リセット
      </button>

      {VRMA_FILES.length > 0 && (
        <>
          <p className="text-xs text-white/60 text-center mt-1">VRMAアニメ</p>
          {VRMA_FILES.map(({ url, label, loop }) => (
            <button
              key={url}
              onClick={() => vrmRef.current?.playVrmaAnimation(url, loop)}
              className="rounded-lg bg-blue-500/40 px-4 py-2 text-sm text-white hover:bg-blue-500/60 active:scale-95 transition-all"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => vrmRef.current?.stopVrmaAnimation()}
            className="rounded-lg bg-red-500/40 px-4 py-2 text-sm text-white hover:bg-red-500/60 active:scale-95 transition-all"
          >
            停止
          </button>
        </>
      )}
    </div>
  );
}

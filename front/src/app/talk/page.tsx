"use client";

import AnimationPanel from "@/components/panels/AnimationPanel";
import SlidoPanel from "@/components/panels/SlidoPanel";
import BlackboardPanel from "@/components/BlackboardPanel";
import DialogLogPanel from "@/components/panels/DialogLogPanel";
import IconBar from "@/components/panels/IconBar";
import MobileTabBar from "@/components/panels/MobileTabBar";
import NotePanel from "@/components/panels/NotePanel";
import PanelContainer from "@/components/panels/PanelContainer";
import TextPanel from "@/components/panels/TextPanel";
import SessionStartDialog from "@/components/SessionStartDialog";
import SpeechInputBar from "@/components/SpeechInputBar";
import TopBar from "@/components/TopBar";
import VRMChat, { type VRMChatHandle } from "@/components/VRMChat";
import VRMMotionDebugPanel from "@/components/VRMMotionDebugPanel";
import { useChat } from "@/hooks/useChat";
import { useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useEmotionStore } from "@/stores/emotionStore";
import type { ExpressionName } from "@/lib/vrmExpressions";

export default function MainPage() {
  const vrmRef = useRef<VRMChatHandle>(null);
  const { status } = useSessionStore();
  const { emotion } = useEmotionStore();

  // 感情 → VRM 表情マッピング
  const EMOTION_TO_EXPRESSION: Record<string, ExpressionName | null> = {
    joy: "happy",
    thinking: "surprised",
    confused: "sad",
    encouraging: "relaxed",
    neutral: null,
  };

  useEffect(() => {
    const expressionName = EMOTION_TO_EXPRESSION[emotion];
    if (expressionName) {
      vrmRef.current?.playExpression(expressionName);
    } else {
      vrmRef.current?.clearExpression();
    }
  }, [emotion]);
  const {
    isSpeaking,
    isListening,
    isProcessing,
    isSupported,
    transcript,
    interimTranscript,
    hasUserInteracted,
    handleStart,
    handleSend,
    startListening,
    stopListening,
  } = useChat();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* VRM背景 */}
      <div className="absolute inset-0 z-0">
        <VRMChat ref={vrmRef} isSpeaking={isSpeaking} />
      </div>

      {/* 黒板パネル */}
      <PanelContainer panel="blackboard">
        <BlackboardPanel />
      </PanelContainer>

      {/* アニメーションパネル */}
      <PanelContainer panel="animation">
        <AnimationPanel />
      </PanelContainer>

      {/* スライドパネル */}
      <PanelContainer panel="slido">
        <SlidoPanel />
      </PanelContainer>

      {/* トップバー */}
      <TopBar />

      {/* パネル */}
      <PanelContainer panel="text">
        <TextPanel />
      </PanelContainer>
      <PanelContainer panel="note">
        <NotePanel onShowToAlice={hasUserInteracted ? handleSend : undefined} />
      </PanelContainer>
      <PanelContainer panel="log">
        <DialogLogPanel />
      </PanelContainer>

      {/* PC: アイコンバー */}
      <IconBar />

      {/* スマホ: タブバー */}
      <MobileTabBar />

      {/* セッション開始ダイアログ */}
      <SessionStartDialog onStarted={handleStart} />

      {/* モーション確認パネル（開発用） */}
      {process.env.NODE_ENV === "development" && (
        <VRMMotionDebugPanel vrmRef={vrmRef} />
      )}

      {/* 音声入力バー */}
      {hasUserInteracted && (
        <SpeechInputBar
          isListening={isListening}
          transcript={transcript}
          interimTranscript={interimTranscript}
          isSupported={isSupported}
          isProcessing={isProcessing}
          isSpeaking={isSpeaking}
          onSend={handleSend}
          onStartListening={startListening}
          onStopListening={stopListening}
        />
      )}
    </div>
  );
}

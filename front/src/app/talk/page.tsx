"use client";

import BlackboardOverlay from "@/components/BlackboardOverlay";
import DialogLogPanel from "@/components/panels/DialogLogPanel";
import IconBar from "@/components/panels/IconBar";
import MobileTabBar from "@/components/panels/MobileTabBar";
import NotePanel from "@/components/panels/NotePanel";
import PanelContainer from "@/components/panels/PanelContainer";
import TextPanel from "@/components/panels/TextPanel";
import SessionStartDialog from "@/components/SessionStartDialog";
import SpeechInputBar from "@/components/SpeechInputBar";
import TopBar from "@/components/TopBar";
import VRMChat from "@/components/VRMChat";
import { useChat } from "@/hooks/useChat";
import { useSessionStore } from "@/stores/sessionStore";

export default function MainPage() {
  const { status } = useSessionStore();
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
        <VRMChat isSpeaking={isSpeaking} />
      </div>

      {/* 黒板オーバーレイ */}
      <BlackboardOverlay />

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

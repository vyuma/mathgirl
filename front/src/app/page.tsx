"use client";

import VRMChat from "@/components/VRMChat";
import BlackboardOverlay from "@/components/BlackboardOverlay";
import TopBar from "@/components/TopBar";
import SessionStartDialog from "@/components/SessionStartDialog";
import PanelContainer from "@/components/panels/PanelContainer";
import TextPanel from "@/components/panels/TextPanel";
import NotePanel from "@/components/panels/NotePanel";
import DialogLogPanel from "@/components/panels/DialogLogPanel";
import IconBar from "@/components/panels/IconBar";
import MobileTabBar from "@/components/panels/MobileTabBar";
import { useChat } from "@/hooks/useChat";
import { useSessionStore } from "@/stores/sessionStore";

export default function MainPage() {
  const { status } = useSessionStore();
  const { isSpeaking, handleStart } = useChat();

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
        <NotePanel />
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

      {/* 未開始時のオーバーレイ (セッションがactiveだがまだ接続していない場合) */}
      {status === "active" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          {/* 音声入力UIは今はDialogLogPanel内 */}
        </div>
      )}
    </div>
  );
}

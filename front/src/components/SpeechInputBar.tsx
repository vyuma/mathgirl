"use client";

import { useCallback, useRef, useState } from "react";

interface SpeechInputBarProps {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  onSend: (text?: string) => void;
  onStartListening: () => void;
  onStopListening: () => void;
}

export default function SpeechInputBar({
  isListening,
  transcript,
  interimTranscript,
  isSupported,
  isProcessing,
  isSpeaking,
  onSend,
  onStartListening,
  onStopListening,
}: SpeechInputBarProps) {
  const [manualText, setManualText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);

  const displayText = transcript + interimTranscript;
  const hasText = displayText.trim().length > 0 || manualText.trim().length > 0;

  const handleSend = useCallback(() => {
    // 多重送信防止
    if (isSendingRef.current || isProcessing) {
      return;
    }

    const textToSend = manualText.trim() || transcript.trim();
    if (!textToSend) {
      return;
    }

    isSendingRef.current = true;

    if (manualText.trim()) {
      onSend(manualText.trim());
      setManualText("");
    } else {
      onSend();
    }

    // 少し遅延を入れてから再送信可能にする
    setTimeout(() => {
      isSendingRef.current = false;
    }, 500);
  }, [manualText, transcript, onSend, isProcessing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Pulse animation for the mic
  const micPulse = isListening && !isProcessing && !isSpeaking;

  return (
    <div className="absolute bottom-35 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl">
      {/* Live transcript display (テキストがある限り表示) */}
      {displayText && (
        <div className="mb-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 shadow-md backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 text-xs ${isListening ? "text-slate-500 animate-pulse" : "text-orange-400"}`}>
              {isListening ? "\u{1F399}" : "\u26A0\uFE0F"}
            </span>
            <p className="text-sm text-slate-800 leading-relaxed">
              <span>{transcript}</span>
              {interimTranscript && (
                <span className="text-slate-400">{interimTranscript}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Input bar (入力エリア全体) */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-full border border-slate-200 bg-white/74 backdrop-blur-sm">
        
        {/* Text input (左側に配置) */}
        <input
          ref={inputRef}
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening ? "音声を認識中..." : "教えてみよう！"
          }
          className="flex-1 bg-transparent text-base text-slate-800 placeholder-slate-400 outline-none px-3"
        />

        {/* Dynamic Button (右側：状況に応じてマイクと送信を切り替え) */}
        {hasText && !isListening ? (
          /* --- 送信ボタン（テキストがあり、かつ音声入力中でない場合） --- */
          <button
            type="button"
            onClick={handleSend}
            disabled={isProcessing || isSpeaking}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              !isProcessing && !isSpeaking
                ? "text-slate-600  hover:bg-teal-400 hover:text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          /* --- マイクボタン（テキストがない、または音声入力中の場合） --- */
          isSupported && (
            <button
              onClick={isListening ? onStopListening : onStartListening}
              disabled={isProcessing || isSpeaking}
              className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-pink-500 text-white shadow-md"
                  : isProcessing || isSpeaking
                    ? "text-slate-400"
                    : "bg-orange-400 text-white shadow-md hover:bg-orange-500"
              } ${isProcessing || isSpeaking ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {micPulse && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
              )}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )
        )}
      </div>

      {/* Status indicator (ステータス表示) */}
      <div className="flex justify-center mt-2">
        <span className={`text-sm font-medium tracking-wide ${
          !isListening && !isProcessing && !isSpeaking && isSupported
            ? "text-orange-400 animate-pulse"
            : "text-slate-500"
        }`}>
          {!isSupported
            ? "このブラウザは音声認識に対応していません"
            : isProcessing
              ? "処理中..."
              : isSpeaking
                ? "応答中..."
                : isListening
                  ? "聞いています..."
                  : "マイクが止まっています　タップで再開"}
        </span>
      </div>
    </div>
  );
}
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
    <div className="absolute bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg">
      {/* Live transcript display */}
      {isListening && displayText && (
        <div className="mb-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 shadow-md backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <span className="text-slate-500 mt-0.5 animate-pulse text-xs">
              &#x1F399;
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

      {/* Input bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200/60 shadow-lg backdrop-blur-sm"
        style={{
          background:
            "linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(238,242,255,0.92) 100%)",
        }}
      >
        {/* Mic button */}
        {isSupported && (
          <button
            onClick={isListening ? onStopListening : onStartListening}
            disabled={isProcessing || isSpeaking}
            className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? "bg-red-500 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            } ${isProcessing || isSpeaking ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {micPulse && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            )}
            <svg
              width="18"
              height="18"
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
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "音声を認識中..."
              : "テキストを入力またはマイクで話す"
          }
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-300 outline-none px-2"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || isProcessing || isSpeaking}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            hasText && !isProcessing && !isSpeaking
              ? "bg-indigo-500 text-white shadow-md hover:bg-indigo-600"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mt-1.5">
        <span className="text-xs text-slate-400">
          {!isSupported
            ? "このブラウザは音声認識に対応していません"
            : isProcessing
              ? "..."
              : isSpeaking
                ? "..."
                : isListening
                  ? "聞いています..."
                  : ""}
        </span>
      </div>
    </div>
  );
}

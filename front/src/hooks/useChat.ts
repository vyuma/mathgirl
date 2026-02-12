"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useStreamingAudio } from "@/lib/audio";
import { useSpeechRecognition } from "@/lib/stt";
import { type Speaker, useCoeiroink } from "@/lib/tts/useCoeiroink";
import {
  type AudioChunk,
  type ChatMessage,
  type CompleteMessage,
  type TextChunk,
  useChatWebSocket,
} from "@/lib/websocket";
import { useBlackboardStore } from "@/stores/blackboardStore";
import { useDialogStore } from "@/stores/dialogStore";
import { usePanelStore } from "@/stores/panelStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useUnderstandingStore } from "@/stores/understandingStore";

export function useChat() {
  const { data: authSession } = useSession();
  const {
    messages,
    addMessage,
    setStreamingText,
    clearStreaming,
    setIsProcessing,
  } = useDialogStore();
  const { sessionId } = useSessionStore();
  const { addFormula } = useBlackboardStore();
  const { setLevel, setPendingQuestion, setSuggestion, clearSuggestion } = useUnderstandingStore();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [isTurnComplete, setIsTurnComplete] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const textChunksRef = useRef<Map<number, string>>(new Map());
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendRef = useRef<(text?: string) => void>(() => {});

  const { speakers, error: speakerError, getSpeakers } = useCoeiroink();

  const {
    isPlaying,
    initAudio,
    addAudioChunk,
    reset: resetAudio,
  } = useStreamingAudio({
    onSentenceStart: () => {},
    onSentenceEnd: () => {},
  });

  const handleTextChunk = useCallback(
    (chunk: TextChunk) => {
      textChunksRef.current.set(chunk.index, chunk.text);
      const sortedTexts: string[] = [];
      for (let i = 0; i <= chunk.index; i++) {
        const text = textChunksRef.current.get(i);
        if (text) sortedTexts.push(text);
      }
      setStreamingText(sortedTexts.join(""));
    },
    [setStreamingText],
  );

  const handleAudioChunk = useCallback(
    (chunk: AudioChunk) => {
      addAudioChunk(chunk.index, chunk.audio_base64);
    },
    [addAudioChunk],
  );

  const handleComplete = useCallback(
    (message: CompleteMessage) => {
      addMessage({ role: "assistant", content: message.full_text });
      clearStreaming();
      textChunksRef.current.clear();
      setIsTurnComplete(true);
    },
    [addMessage, clearStreaming],
  );

  const handleWsError = useCallback(
    (_error: string) => {
      clearStreaming();
      textChunksRef.current.clear();
      setIsSpeaking(false);
      setIsTurnComplete(false);
      setIsProcessing(false);
    },
    [clearStreaming, setIsProcessing],
  );

  const {
    connectionState,
    isProcessing: wsProcessing,
    connect,
    disconnect,
    sendChatRequest,
    isConnected,
  } = useChatWebSocket({
    onTextChunk: handleTextChunk,
    onAudioChunk: handleAudioChunk,
    onComplete: handleComplete,
    onError: handleWsError,
    onBlackboardUpdate: (data: { latex: string; explanation: string }) => {
      addFormula(data.latex, data.explanation);
      // Auto-open blackboard panel if hidden
      const { panels, togglePanel } = usePanelStore.getState();
      if (!panels.blackboard.visible) {
        togglePanel("blackboard");
      }
    },
    onSuggestOperation: (data: {
      latex: string;
      operation: string;
      explanation: string;
    }) => {
      setSuggestion({
        latex: data.latex,
        operation: data.operation,
        explanation: data.explanation,
      });
    },
    onSocraticQuestion: (data) => {
      setPendingQuestion({
        questionText: data.question_text,
        questionIfCorrect: data.question_if_correct,
        questionIfStuck: data.question_if_stuck,
        visualHintLatex: data.visual_hint_latex,
        currentUnderstandingLevel: data.current_understanding_level,
      });
    },
    onUnderstandingUpdate: (data) => {
      setLevel(data.level, data.topic);
    },
  });

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
  } = useSpeechRecognition({
    language: "ja-JP",
    continuous: true,
    interimResults: true,
    autoRestart: true,
  });

  // Resume listening after playback ends
  useEffect(() => {
    if (!isPlaying && isSpeaking && isTurnComplete) {
      setIsSpeaking(false);
      setIsTurnComplete(false);
      startListening();
    }
  }, [isPlaying, isSpeaking, isTurnComplete, startListening]);

  // Load speakers
  useEffect(() => {
    const loadSpeakers = async () => {
      const speakerList = await getSpeakers();
      if (speakerList.length > 0) {
        setSelectedSpeaker(speakerList[0]);
      }
    };
    loadSpeakers();
  }, [getSpeakers]);

  const handleSend = useCallback(
    async (text?: string) => {
      const userText = (text || transcript).trim();
      if (!userText) {
        console.warn("[useChat] Empty text, not sending");
        return;
      }

      if (!isConnected) {
        console.warn("[useChat] WebSocket not connected, cannot send");
        addMessage({ role: "assistant", content: "接続が切れています。再接続中です...しばらくお待ちください。" });
        return;
      }

      addMessage({ role: "user", content: userText });
      setPendingQuestion(null);
      clearSuggestion();
      clearTranscript();
      stopListening();
      resetAudio();
      setIsTurnComplete(false);
      setIsSpeaking(true);
      setIsProcessing(true);

      const chatMessages: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userText },
      ];

      // スピーカーが未選択でもデフォルト値で送信
      const speakerUuid = selectedSpeaker?.speaker_uuid ?? "";
      const currentStyleId =
        selectedSpeaker?.styles[selectedStyleIndex]?.id ?? 0;

      const sent = sendChatRequest(
        chatMessages,
        speakerUuid,
        currentStyleId,
        undefined,
        sessionId || undefined,
      );

      // 送信失敗時は状態をリセット
      if (!sent) {
        setIsSpeaking(false);
        setIsProcessing(false);
      }
    },
    [
      transcript,
      selectedSpeaker,
      selectedStyleIndex,
      messages,
      isConnected,
      sessionId,
      addMessage,
      setPendingQuestion,
      clearSuggestion,
      clearTranscript,
      stopListening,
      resetAudio,
      sendChatRequest,
      setIsProcessing,
    ],
  );

  // handleSend を ref で最新に保つ（useEffect 内から呼ぶため）
  handleSendRef.current = handleSend;

  // 2秒間の無音検知 → 自動送信
  useEffect(() => {
    // 送信中・AI応答中・リスニングしていない場合はタイマー不要
    if (isSpeaking || wsProcessing || !isListening) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    // まだ interim が来ている（話し途中）or transcript が空 → タイマーリセット
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // transcript があり、interim が空（発話が止まった）→ 2秒タイマー開始
    if (transcript.trim() && !interimTranscript) {
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        handleSendRef.current();
      }, 2000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [transcript, interimTranscript, isListening, isSpeaking, wsProcessing]);

  const handleStart = useCallback(() => {
    setHasUserInteracted(true);
    initAudio();
    connect(authSession?.idToken);
    startListening();
  }, [initAudio, connect, authSession?.idToken, startListening]);

  return {
    isSpeaking,
    isListening,
    isProcessing: wsProcessing,
    isConnected,
    connectionState,
    hasUserInteracted,
    transcript,
    interimTranscript,
    isSupported,
    selectedSpeaker,
    speakers,
    speakerError,
    selectedStyleIndex,
    setSelectedSpeaker,
    setSelectedStyleIndex,
    handleSend,
    handleStart,
    startListening,
    stopListening,
    connect,
    disconnect,
  };
}

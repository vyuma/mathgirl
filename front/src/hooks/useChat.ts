"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useSessionStore } from "@/stores/sessionStore";
import { useUnderstandingStore } from "@/stores/understandingStore";

export function useChat() {
  const {
    messages,
    addMessage,
    setStreamingText,
    clearStreaming,
    setIsProcessing,
  } = useDialogStore();
  const { sessionId } = useSessionStore();
  const { addFormula } = useBlackboardStore();
  const { setLevel, setPendingQuestion } = useUnderstandingStore();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [isTurnComplete, setIsTurnComplete] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const textChunksRef = useRef<Map<number, string>>(new Map());

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
    },
    [clearStreaming],
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
    },
    onSuggestOperation: (data: {
      latex: string;
      operation: string;
      explanation: string;
    }) => {
      addMessage({
        role: "assistant",
        content: data.explanation,
        contentType: "suggest_operation",
        metadata: { latex: data.latex, operation: data.operation },
      });
    },
    onSocraticQuestion: (data) => {
      setPendingQuestion({
        questionIfCorrect: data.question_if_correct,
        questionIfStuck: data.question_if_stuck,
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
        return;
      }

      addMessage({ role: "user", content: userText });
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

      sendChatRequest(
        chatMessages,
        speakerUuid,
        currentStyleId,
        undefined,
        sessionId || undefined,
      );
    },
    [
      transcript,
      selectedSpeaker,
      selectedStyleIndex,
      messages,
      isConnected,
      sessionId,
      addMessage,
      clearTranscript,
      stopListening,
      resetAudio,
      sendChatRequest,
    ],
  );

  const handleStart = useCallback(() => {
    setHasUserInteracted(true);
    initAudio();
    connect();
  }, [initAudio, connect]);

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

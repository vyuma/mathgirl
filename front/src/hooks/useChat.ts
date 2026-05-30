"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useStreamingAudio } from "@/lib/audio";
import { useSpeechRecognition } from "@/lib/stt";
import { useCoeiroink } from "@/lib/tts/useCoeiroink";
import {
  type AudioChunk,
  type ChatMessage,
  type CompleteMessage,
  type TextChunk,
  useChatWebSocket,
} from "@/lib/websocket";
import { useAnimationStore } from "@/stores/animationStore";
import { useBlackboardStore } from "@/stores/blackboardStore";
import { useDialogStore } from "@/stores/dialogStore";
import { usePanelStore } from "@/stores/panelStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useUnderstandingStore } from "@/stores/understandingStore";
import { type EmotionCategory, useEmotionStore } from "@/stores/emotionStore";
import { useSpeakerStore } from "@/stores/speakerStore";
import { useTimerStore } from "@/stores/timerStore";

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
  const { startJob, updateProgress, completeJob, failJob } = useAnimationStore();
  const { setLevel, setPendingQuestion, setSuggestion, clearSuggestion } = useUnderstandingStore();
  const { setEmotion } = useEmotionStore();

  const {
    selectedSpeaker,
    selectedStyleIndex,
    setSpeaker: setStoreSpeaker,
    setStyleIndex: setStoreStyleIndex,
  } = useSpeakerStore();

  const isTimerWork = useTimerStore((s) => s.phase === "work");

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTurnComplete, setIsTurnComplete] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const textChunksRef = useRef<Map<number, string>>(new Map());
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prolongedSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const handleSilencePromptRef = useRef<() => void>(() => {});
  const handleFocusWarningRef = useRef<() => void>(() => {});

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
      addAudioChunk(chunk.index, chunk.audio_base64, chunk.is_final ?? true);
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
    onAnimationStarted: (data) => {
      startJob(data.job_id, data.generation_id, data.description);
      // Auto-open animation panel
      const { panels, togglePanel } = usePanelStore.getState();
      if (!panels.animation.visible) {
        togglePanel("animation");
      }
    },
    onAnimationProgress: (data) => {
      updateProgress(data.job_id, data.progress, data.current_step);
    },
    onAnimationComplete: (data) => {
      completeJob(data.job_id, data.generation_id, data.video_id, data.video_url);
    },
    onAnimationFailed: (data) => {
      failJob(data.job_id, data.error);
    },
    onEmotionUpdate: (data) => {
      const valid: EmotionCategory[] = ["joy", "thinking", "confused", "encouraging", "neutral"];
      const emotion = valid.includes(data.emotion as EmotionCategory)
        ? (data.emotion as EmotionCategory)
        : "neutral";
      setEmotion(emotion, data.intensity, data.reason);
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

  // Load speakers; ストア未選択のときだけ先頭を自動選択
  useEffect(() => {
    const loadSpeakers = async () => {
      const speakerList = await getSpeakers();
      if (speakerList.length > 0 && !selectedSpeaker) {
        setStoreSpeaker(speakerList[0], 0);
      }
    };
    loadSpeakers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 長時間無言のときみくるに話しかけさせる（チャットログには表示しない）
  const handleSilencePrompt = useCallback(() => {
    if (!isConnected) return;
    const speakerUuid = selectedSpeaker?.speaker_uuid ?? "";
    const currentStyleId = selectedSpeaker?.styles[selectedStyleIndex]?.id ?? 0;
    const chatMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: "（ユーザーがしばらく黙っています。自然に話しかけてください）" },
    ];
    clearTranscript();
    stopListening();
    resetAudio();
    setIsTurnComplete(false);
    setIsSpeaking(true);
    setIsProcessing(true);
    sendChatRequest(chatMessages, speakerUuid, currentStyleId, undefined, sessionId || undefined);
  }, [
    isConnected,
    selectedSpeaker,
    selectedStyleIndex,
    messages,
    sessionId,
    clearTranscript,
    stopListening,
    resetAudio,
    sendChatRequest,
    setIsProcessing,
  ]);

  handleSilencePromptRef.current = handleSilencePrompt;

  // タイマー集中中にユーザーが話しかけてきたとき → 集中を促す（ログには追加しない）
  const handleTimerFocusWarning = useCallback(() => {
    if (!isConnected) return;
    const speakerUuid = selectedSpeaker?.speaker_uuid ?? "";
    const currentStyleId = selectedSpeaker?.styles[selectedStyleIndex]?.id ?? 0;
    const chatMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user" as const,
        content:
          "（タイマー集中中にユーザーが話しかけてきました。集中を優しく促す一言を返してください。長い返答は不要です）",
      },
    ];
    clearTranscript();
    stopListening();
    resetAudio();
    setIsTurnComplete(false);
    setIsSpeaking(true);
    setIsProcessing(true);
    sendChatRequest(chatMessages, speakerUuid, currentStyleId, undefined, sessionId || undefined);
  }, [
    isConnected,
    selectedSpeaker,
    selectedStyleIndex,
    messages,
    sessionId,
    clearTranscript,
    stopListening,
    resetAudio,
    sendChatRequest,
    setIsProcessing,
  ]);

  handleFocusWarningRef.current = handleTimerFocusWarning;

  // タイマーフェーズ切り替え時のアナウンス（page.tsx から呼ぶ）
  const handleTimerAnnouncement = useCallback(
    (msg: string) => {
      if (!isConnected) return;
      const speakerUuid = selectedSpeaker?.speaker_uuid ?? "";
      const currentStyleId = selectedSpeaker?.styles[selectedStyleIndex]?.id ?? 0;
      const chatMessages: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: msg },
      ];
      resetAudio();
      setIsTurnComplete(false);
      setIsSpeaking(true);
      setIsProcessing(true);
      sendChatRequest(chatMessages, speakerUuid, currentStyleId, undefined, sessionId || undefined);
    },
    [
      isConnected,
      selectedSpeaker,
      selectedStyleIndex,
      messages,
      sessionId,
      resetAudio,
      sendChatRequest,
      setIsProcessing,
    ],
  );

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
        if (isTimerWork) {
          handleFocusWarningRef.current();
        } else {
          handleSendRef.current();
        }
      }, 2000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [transcript, interimTranscript, isListening, isSpeaking, wsProcessing, isTimerWork]);

  // 8秒間まったく話していない → みくるが話しかける
  useEffect(() => {
    if (prolongedSilenceTimerRef.current) {
      clearTimeout(prolongedSilenceTimerRef.current);
      prolongedSilenceTimerRef.current = null;
    }

    // 発話中・AI応答中・未接続・リスニングしていない・タイマー作業中はタイマー不要
    if (isSpeaking || wsProcessing || !isListening || !isConnected || isTimerWork) return;

    // transcript または interim がある（ユーザーが話している or 話した）→ タイマー不要
    if (transcript || interimTranscript) return;

    // 無言が続いている → 8秒後にみくるが話しかける
    prolongedSilenceTimerRef.current = setTimeout(() => {
      prolongedSilenceTimerRef.current = null;
      handleSilencePromptRef.current();
    }, 8000);

    return () => {
      if (prolongedSilenceTimerRef.current) {
        clearTimeout(prolongedSilenceTimerRef.current);
        prolongedSilenceTimerRef.current = null;
      }
    };
  }, [transcript, interimTranscript, isListening, isSpeaking, wsProcessing, isConnected, isTimerWork]);

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
    setSelectedSpeaker: setStoreSpeaker,
    setSelectedStyleIndex: setStoreStyleIndex,
    handleSend,
    handleStart,
    handleTimerAnnouncement,
    startListening,
    stopListening,
    connect,
    disconnect,
  };
}

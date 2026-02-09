"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import VRMChat from "@/components/VRMChat";
import { useSpeechRecognition } from "@/lib/stt";
import BackIcon from "@/components/icon/back";
import { useCoeiroink, type Speaker } from "@/lib/tts/useCoeiroink";
import {
  useChatWebSocket,
  type ChatMessage,
  type TextChunk,
  type AudioChunk,
  type CompleteMessage,
} from "@/lib/websocket";
import { useStreamingAudio } from "@/lib/audio";
import { useAizuchi } from "@/lib/aizuchi";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [_goal, setGoal] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(0);
  const [showSpeakerSelector, setShowSpeakerSelector] = useState(false);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isTurnComplete, setIsTurnComplete] = useState(false);
  const hasGreetedRef = useRef(false);
  const textChunksRef = useRef<Map<number, string>>(new Map());

  // クライアントサイドでCOEIROINKに直接アクセス（スピーカー一覧用）
  const {
    speakers,
    error: speakerError,
    getSpeakers,
  } = useCoeiroink();

  // ストリーミング音声再生
  const {
    isPlaying,
    initAudio,
    addAudioChunk,
    reset: resetAudio,
  } = useStreamingAudio({
    onSentenceStart: () => {
      // isSpeaking はターン単位で handleSend/useEffect で管理
    },
    onSentenceEnd: () => {
      // 再生が続いているかどうかは isPlaying で判断
    },
  });

  const { scheduleAizuchi, cancel: cancelAizuchi } = useAizuchi();

  // WebSocketハンドラー
  const handleTextChunk = useCallback((chunk: TextChunk) => {
    console.log("Received text chunk:", chunk.index, "text:", chunk.text);
    textChunksRef.current.set(chunk.index, chunk.text);

    // インデックス順にテキストを結合
    const sortedTexts: string[] = [];
    for (let i = 0; i <= chunk.index; i++) {
      const text = textChunksRef.current.get(i);
      if (text) sortedTexts.push(text);
    }
    setStreamingText(sortedTexts.join(""));
  }, []);

  const handleAudioChunk = useCallback(
    (chunk: AudioChunk) => {
      cancelAizuchi();
      console.log("Received audio chunk:", chunk.index, "base64 length:", chunk.audio_base64.length);
      addAudioChunk(chunk.index, chunk.audio_base64);
    },
    [addAudioChunk, cancelAizuchi]
  );

  const handleComplete = useCallback((message: CompleteMessage) => {
    // ストリーミングテキストをメッセージに追加
    setMessages((prev: Message[]) => [
      ...prev,
      { role: "assistant", content: message.full_text },
    ]);
    setStreamingText("");
    textChunksRef.current.clear();
    setIsTurnComplete(true);
  }, []);

  const handleWsError = useCallback((error: string) => {
    console.error("WebSocket error:", error);
    cancelAizuchi();
    setStreamingText("");
    textChunksRef.current.clear();
  }, [cancelAizuchi]);

  // WebSocket接続
  const {
    connectionState,
    isProcessing,
    connect,
    disconnect,
    sendChatRequest,
    isConnected,
  } = useChatWebSocket({
    onTextChunk: handleTextChunk,
    onAudioChunk: handleAudioChunk,
    onComplete: handleComplete,
    onError: handleWsError,
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

  // 無音検出用のタイマー
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const SILENCE_THRESHOLD_MS = 1500;

  // isPlayingの変化を追跡（音声再生完了後にリスニング再開）
  useEffect(() => {
    if (!isPlaying && isSpeaking && isTurnComplete) {
      // 全音声再生完了 かつ complete受信済み
      setIsSpeaking(false);
      setIsTurnComplete(false);
      startListening();
    }
  }, [isPlaying, isSpeaking, isTurnComplete, startListening]);

  // スピーカー一覧を取得
  useEffect(() => {
    const loadSpeakers = async () => {
      setIsLoadingSpeakers(true);
      const speakerList = await getSpeakers();
      if (speakerList.length > 0) {
        setSelectedSpeaker(speakerList[0]);
      }
      setIsLoadingSpeakers(false);
    };

    loadSpeakers();
  }, [getSpeakers]);

  // フォールバック用のspeak関数（WebSocket未接続時）
  const speakTextFallback = useCallback(
    async (text: string) => {
      if (!selectedSpeaker) {
        console.error("Speaker not selected");
        return;
      }

      setIsSpeaking(true);

      try {
        const styleId = selectedSpeaker.styles[selectedStyleIndex]?.id ?? 0;

        // Next.js rewrites経由でバックエンドにプロキシ
        const response = await fetch(`/api/backend/synthesis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            speaker_uuid: selectedSpeaker.speaker_uuid,
            style_id: styleId,
          }),
        });

        if (!response.ok) {
          console.error("Failed to synthesize audio:", response.status);
          setIsSpeaking(false);
          return;
        }

        const audioBlob = await response.blob();
        console.log("Audio blob received:", audioBlob.size, "bytes, type:", audioBlob.type);

        // Blobの型を明示的に設定
        const wavBlob = new Blob([audioBlob], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);

        // 音声の読み込みを待つ
        await new Promise<void>((resolve, reject) => {
          audio.oncanplaythrough = () => {
            console.log("Audio loaded and ready to play");
            resolve();
          };
          audio.onerror = (e) => {
            console.error("Audio load error:", e);
            reject(e);
          };
          audio.load();
        });

        audio.onended = () => {
          console.log("Audio playback ended");
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          startListening();
        };

        try {
          await audio.play();
          console.log("Audio playback started");
        } catch (playError) {
          console.error("Failed to play audio:", playError);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          startListening();
        }
      } catch (error) {
        console.error("TTS Error:", error);
        setIsSpeaking(false);
      }
    },
    [selectedSpeaker, selectedStyleIndex, startListening]
  );

  // ユーザー操作後に挨拶を再生
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedSpeaker) return;
    if (!hasUserInteracted) return;
    if (hasGreetedRef.current) return;

    hasGreetedRef.current = true;

    const savedGoal = sessionStorage.getItem("todayGoal");
    if (savedGoal) {
      setGoal(savedGoal);
    }

    const greetingText = savedGoal
      ? "お疲れさま！今日の目標は「" + savedGoal + "」だったね。頑張ったね！"
      : "お疲れさま！今日も頑張ったね！";

    setMessages([{ role: "assistant", content: greetingText }]);

    // 挨拶はフォールバックで再生（初回のみ）
    // 注意: setTimeoutを使うと音声再生がブロックされる可能性がある
    speakTextFallback(greetingText);
  }, [selectedSpeaker, speakTextFallback, hasUserInteracted]);

  // 開始ボタンクリック時の処理
  const handleStart = useCallback(() => {
    setHasUserInteracted(true);
    initAudio();
    connect();
  }, [initAudio, connect]);

  const handleSend = useCallback(async () => {
    const userText = transcript.trim();
    if (!userText) return;
    if (!selectedSpeaker) return;

    const newUserMessage: Message = { role: "user", content: userText };
    setMessages((prev: Message[]) => [...prev, newUserMessage]);
    clearTranscript();
    stopListening();
    resetAudio();
    setIsTurnComplete(false);
    setIsSpeaking(true);

    // 目標を取得
    const goal = sessionStorage.getItem("todayGoal") || undefined;

    // WebSocket経由でリクエスト送信
    if (isConnected) {
      const chatMessages: ChatMessage[] = [...messages, newUserMessage].map(
        (m) => ({
          role: m.role,
          content: m.content,
        })
      );

      const currentStyleId = selectedSpeaker.styles[selectedStyleIndex]?.id ?? 0;
      const success = sendChatRequest(
        chatMessages,
        selectedSpeaker.speaker_uuid,
        currentStyleId,
        goal
      );

      if (success) {
        scheduleAizuchi(selectedSpeaker.name);
      } else {
        // WebSocket送信失敗時はフォールバック
        await fallbackSend(newUserMessage, goal);
      }
    } else {
      // WebSocket未接続時はフォールバック
      await fallbackSend(newUserMessage, goal);
    }
  }, [
    transcript,
    clearTranscript,
    stopListening,
    messages,
    selectedSpeaker,
    selectedStyleIndex,
    isConnected,
    sendChatRequest,
    resetAudio,
    scheduleAizuchi,
  ]);

  // フォールバック: バックエンドAPI経由
  const fallbackSend = useCallback(
    async (newUserMessage: Message, goal?: string) => {
      try {
        // Next.js rewrites経由でバックエンドにプロキシ
        const response = await fetch(`/api/backend/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, newUserMessage],
            goal,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.content;

        setMessages((prev: Message[]) => [
          ...prev,
          { role: "assistant", content: responseText },
        ]);
        await speakTextFallback(responseText);
      } catch (error) {
        console.error("Chat API Error:", error);
        const fallbackText =
          "ごめんね、うまく聞き取れなかったみたい。もう一度言ってくれる？";
        setMessages((prev: Message[]) => [
          ...prev,
          { role: "assistant", content: fallbackText },
        ]);
        await speakTextFallback(fallbackText);
      }
    },
    [messages, speakTextFallback]
  );

  // 無音検出: transcriptが一定時間変化しなかったら自動送信
  useEffect(() => {
    if (!isListening || isSpeaking || isProcessing) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      lastTranscriptRef.current = "";
      return;
    }

    const currentTranscript = transcript + interimTranscript;

    if (!transcript.trim()) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      lastTranscriptRef.current = currentTranscript;
      return;
    }

    if (currentTranscript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = currentTranscript;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    if (!silenceTimerRef.current && transcript.trim()) {
      silenceTimerRef.current = setTimeout(() => {
        handleSend();
        silenceTimerRef.current = null;
      }, SILENCE_THRESHOLD_MS);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [
    transcript,
    interimTranscript,
    isListening,
    isSpeaking,
    isProcessing,
    handleSend,
  ]);

  const handleBack = () => {
    sessionStorage.removeItem("todayGoal");
    disconnect();
    router.push("/home");
  };

  const handleSpeakerChange = (speakerUuid: string) => {
    const speaker = speakers.find((s: Speaker) => s.speaker_uuid === speakerUuid);
    if (speaker) {
      setSelectedSpeaker(speaker);
      setSelectedStyleIndex(0);
    }
  };

  const handleStyleChange = (styleIndex: number) => {
    setSelectedStyleIndex(styleIndex);
  };

  // 接続状態の表示テキスト
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case "connecting":
        return "接続中...";
      case "connected":
        return "接続済み";
      case "error":
        return "接続エラー";
      default:
        return "未接続";
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <VRMChat isSpeaking={isSpeaking} />
      </div>

      {/* 開始オーバーレイ - ユーザー操作前に表示 */}
      {!hasUserInteracted && !isLoadingSpeakers && selectedSpeaker && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-amber-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-amber-600 transition transform hover:scale-105 active:scale-95"
          >
            タップして開始
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="p-4 flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition"
          >
            <BackIcon />
          </button>

          {/* スピーカー選択ボタン */}
          <button
            onClick={() => setShowSpeakerSelector(!showSpeakerSelector)}
            disabled={isLoadingSpeakers || !!speakerError}
            className="p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition disabled:opacity-50"
            title="音声を選択"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>

          {selectedSpeaker && (
            <span className="text-sm bg-white/80 px-3 py-1 rounded-full shadow">
              {selectedSpeaker.name}
              {selectedSpeaker.styles.length > 1 &&
                ` - ${selectedSpeaker.styles[selectedStyleIndex]?.name}`}
            </span>
          )}

          {/* WebSocket接続状態 */}
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              connectionState === "connected"
                ? "bg-green-100 text-green-700"
                : connectionState === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {getConnectionStatusText()}
          </span>
        </div>

        {/* スピーカー選択パネル */}
        {showSpeakerSelector && (
          <div className="mx-4 p-4 bg-white/95 rounded-2xl shadow-lg space-y-3">
            <h3 className="font-bold text-gray-800">音声を選択</h3>

            {speakerError && (
              <p className="text-red-500 text-sm">{speakerError}</p>
            )}

            {isLoadingSpeakers ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-600">
                    キャラクター
                  </label>
                  <select
                    value={selectedSpeaker?.speaker_uuid ?? ""}
                    onChange={(e) => handleSpeakerChange(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    {speakers.map((speaker) => (
                      <option
                        key={speaker.speaker_uuid}
                        value={speaker.speaker_uuid}
                      >
                        {speaker.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSpeaker && selectedSpeaker.styles.length > 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-600">
                      スタイル
                    </label>
                    <select
                      value={selectedStyleIndex}
                      onChange={(e) =>
                        handleStyleChange(Number(e.target.value))
                      }
                      className="w-full p-2 border rounded-lg bg-white"
                    >
                      {selectedSpeaker.styles.map((style, index) => (
                        <option key={style.id} value={index}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setShowSpeakerSelector(false)}
                  className="w-full p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="p-4 space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-2xl max-w-[80%] ${
                  msg.role === "assistant"
                    ? "bg-amber-100/90 text-amber-900 self-start"
                    : "bg-white/90 text-gray-800 self-end ml-auto"
                }`}
              >
                {msg.content}
              </div>
            ))}

            {/* ストリーミング中のテキスト */}
            {streamingText && (
              <div className="p-3 rounded-2xl max-w-[80%] bg-amber-100/90 text-amber-900 self-start">
                {streamingText}
                <span className="animate-pulse">▌</span>
              </div>
            )}
          </div>

          {(transcript || interimTranscript) && (
            <div className="bg-white/90 p-3 rounded-2xl text-gray-800">
              {transcript}
              <span className="text-gray-400">{interimTranscript}</span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-white/90 p-3 rounded-2xl shadow-lg">
            {/* リスニング状態のインジケーター */}
            <div
              className={`p-3 rounded-full ${
                isListening
                  ? "bg-red-500 animate-pulse"
                  : isSpeaking || isProcessing
                    ? "bg-amber-500"
                    : "bg-gray-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>

            <div className="flex-1 text-gray-600 text-sm">
              {isLoadingSpeakers
                ? "音声エンジン初期化中..."
                : speakerError
                  ? "COEIROINKに接続できません"
                  : !selectedSpeaker
                    ? "スピーカーを選択してください"
                    : isProcessing
                      ? "応答生成中..."
                      : isSpeaking
                        ? "話し中..."
                        : isListening
                          ? "話しかけてね..."
                          : "準備中..."}
            </div>

            {/* 送信ボタン */}
            <button
              onClick={handleSend}
              disabled={
                !transcript.trim() ||
                isSpeaking ||
                isProcessing ||
                !selectedSpeaker
              }
              className={`p-3 rounded-full bg-amber-500 text-white transition ${
                !transcript.trim() ||
                isSpeaking ||
                isProcessing ||
                !selectedSpeaker
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-amber-600"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>

          {!isSupported && (
            <p className="text-center text-red-500 text-sm bg-white/80 p-2 rounded-lg">
              お使いのブラウザは音声認識に対応していません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

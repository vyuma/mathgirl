"use client";

import { useState, useRef, useCallback } from "react";

type UseAizuchiOptions = {
  speakerUuid: string;
  styleId: number;
  onAizuchiReady?: (audioBlob: Blob, text: string) => void;
  onAizuchiPlay?: () => void;
  onAizuchiEnd?: () => void;
  minTextLength?: number; // 相槌をトリガーする最小文字数
  useLLM?: boolean; // LLMを使うか
};

export function useAizuchi(options: UseAizuchiOptions) {
  const {
    speakerUuid,
    styleId,
    onAizuchiReady,
    onAizuchiPlay,
    onAizuchiEnd,
    minTextLength = 10, // デフォルト10文字で相槌準備開始
    useLLM = false,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 相槌音声を事前取得
   */
  const prefetchAizuchi = useCallback(
    async (userText: string) => {
      // 既に取得済みなら何もしない
      if (hasFetchedRef.current || isLoading) {
        return;
      }

      // 最小文字数に達していなければ何もしない
      if (userText.length < minTextLength) {
        return;
      }

      hasFetchedRef.current = true;
      setIsLoading(true);

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const response = await fetch(`${apiUrl}/api/aizuchi/audio`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_text: userText,
            speaker_uuid: speakerUuid,
            style_id: styleId,
            use_llm: useLLM,
          }),
        });

        if (!response.ok) {
          console.error("Aizuchi fetch failed:", response.status);
          return;
        }

        const audioBlob = await response.blob();
        const encodedText = response.headers.get("X-Aizuchi-Text") || "%E3%81%86%E3%82%93%E3%81%86%E3%82%93";
        const aizuchiText = decodeURIComponent(encodedText);

        setPendingAudio(audioBlob);
        setPendingText(aizuchiText);
        onAizuchiReady?.(audioBlob, aizuchiText);
      } catch (error) {
        console.error("Aizuchi error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [speakerUuid, styleId, useLLM, minTextLength, isLoading, onAizuchiReady]
  );

  /**
   * 相槌を再生（遅延付き）
   */
  const playAizuchi = useCallback(
    async (delayMs: number = 250) => {
      if (!pendingAudio) {
        return false;
      }

      // 指定時間待つ
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const audioUrl = URL.createObjectURL(pendingAudio);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      return new Promise<boolean>((resolve) => {
        audio.onplay = () => {
          onAizuchiPlay?.();
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          onAizuchiEnd?.();
          resolve(true);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };

        audio.play().catch(() => {
          resolve(false);
        });
      });
    },
    [pendingAudio, onAizuchiPlay, onAizuchiEnd]
  );

  /**
   * 状態をリセット（次の発話用）
   */
  const reset = useCallback(() => {
    hasFetchedRef.current = false;
    setPendingAudio(null);
    setPendingText(null);
    setIsLoading(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return {
    isLoading,
    pendingAudio,
    pendingText,
    hasAizuchi: pendingAudio !== null,
    prefetchAizuchi,
    playAizuchi,
    reset,
  };
}

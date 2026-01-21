"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AudioQueue } from "./AudioQueue";

type UseStreamingAudioOptions = {
  onSentenceStart?: (index: number) => void;
  onSentenceEnd?: (index: number) => void;
};

export function useStreamingAudio(options: UseStreamingAudioOptions = {}) {
  const { onSentenceStart, onSentenceEnd } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  // AudioQueueの初期化
  useEffect(() => {
    const queue = new AudioQueue({
      onPlayingChange: setIsPlaying,
      onSentenceStart: (index) => {
        setCurrentSentenceIndex(index);
        onSentenceStart?.(index);
      },
      onSentenceEnd: (index) => {
        onSentenceEnd?.(index);
      },
    });

    audioQueueRef.current = queue;

    return () => {
      queue.dispose();
    };
  }, [onSentenceStart, onSentenceEnd]);

  /**
   * ユーザー操作後にAudioContextを初期化
   */
  const initAudio = useCallback(() => {
    audioQueueRef.current?.init();
  }, []);

  /**
   * 音声データをキューに追加
   */
  const addAudioChunk = useCallback(
    async (index: number, audioBase64: string) => {
      await audioQueueRef.current?.addAudio(index, audioBase64);
    },
    []
  );

  /**
   * キューをリセット
   */
  const reset = useCallback(() => {
    audioQueueRef.current?.reset();
    setCurrentSentenceIndex(null);
  }, []);

  return {
    isPlaying,
    currentSentenceIndex,
    initAudio,
    addAudioChunk,
    reset,
  };
}

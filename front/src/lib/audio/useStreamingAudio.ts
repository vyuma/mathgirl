"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioQueue } from "./AudioQueue";

type UseStreamingAudioOptions = {
  onSentenceStart?: (index: number) => void;
  onSentenceEnd?: (index: number) => void;
};

export function useStreamingAudio(options: UseStreamingAudioOptions = {}) {
  const { onSentenceStart, onSentenceEnd } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<
    number | null
  >(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);

  // コールバックをrefに保存（useEffectの依存配列から除外するため）
  const onSentenceStartRef = useRef(onSentenceStart);
  const onSentenceEndRef = useRef(onSentenceEnd);

  // コールバックが変わったらrefを更新
  useEffect(() => {
    onSentenceStartRef.current = onSentenceStart;
  }, [onSentenceStart]);

  useEffect(() => {
    onSentenceEndRef.current = onSentenceEnd;
  }, [onSentenceEnd]);

  // AudioQueueの初期化（一度だけ実行）
  useEffect(() => {
    console.log("useStreamingAudio: Creating AudioQueue");
    const queue = new AudioQueue({
      onPlayingChange: setIsPlaying,
      onSentenceStart: (index) => {
        setCurrentSentenceIndex(index);
        onSentenceStartRef.current?.(index);
      },
      onSentenceEnd: (index) => {
        onSentenceEndRef.current?.(index);
      },
    });

    audioQueueRef.current = queue;

    return () => {
      console.log("useStreamingAudio: Disposing AudioQueue");
      queue.dispose();
    };
  }, []); // 空の依存配列で一度だけ実行

  /**
   * ユーザー操作後にAudioContextを初期化
   */
  const initAudio = useCallback(() => {
    console.log("useStreamingAudio: initAudio called");
    audioQueueRef.current?.init();
  }, []);

  /**
   * 音声データをキューに追加
   */
  const addAudioChunk = useCallback(
    async (index: number, audioBase64: string, isFinal: boolean) => {
      await audioQueueRef.current?.addAudio(index, audioBase64, isFinal);
    },
    [],
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

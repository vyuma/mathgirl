"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type TurnTakingPrediction = {
  p_now: number; // 0-600msでの発話終了確率
  p_future: number; // 600-2000msでの発話終了確率
  should_take_turn: boolean;
  confidence: number;
  suggested_wait_ms: number;
};

export type UseTurnTakingOptions = {
  wsUrl?: string;
  onPrediction?: (prediction: TurnTakingPrediction) => void;
  onShouldTakeTurn?: (waitMs: number) => void;
  enabled?: boolean;
};

export function useTurnTaking(options: UseTurnTakingOptions = {}) {
  const {
    wsUrl = `${process.env.NEXT_PUBLIC_WS_URL?.replace("/ws/chat", "") || "ws://localhost:8080"}/ws/turntaking`,
    onPrediction,
    onShouldTakeTurn,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isVapAvailable, setIsVapAvailable] = useState(false);
  const [prediction, setPrediction] = useState<TurnTakingPrediction | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // WebSocket接続
  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("TurnTaking WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "status") {
            setIsVapAvailable(data.vap_available);
            console.log(
              `TurnTaking status: ${data.message}, VAP available: ${data.vap_available}`
            );
          } else if (data.type === "prediction") {
            const pred: TurnTakingPrediction = {
              p_now: data.p_now,
              p_future: data.p_future,
              should_take_turn: data.should_take_turn,
              confidence: data.confidence,
              suggested_wait_ms: data.suggested_wait_ms,
            };
            setPrediction(pred);
            onPrediction?.(pred);

            // ターンを取るべき場合のコールバック
            if (pred.should_take_turn) {
              onShouldTakeTurn?.(pred.suggested_wait_ms);
            }
          } else if (data.type === "error") {
            console.error("TurnTaking error:", data.message);
          }
        } catch (e) {
          console.error("Failed to parse TurnTaking message:", e);
        }
      };

      ws.onclose = () => {
        console.log("TurnTaking WebSocket disconnected");
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error("TurnTaking WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to connect TurnTaking WebSocket:", error);
    }
  }, [wsUrl, enabled, onPrediction, onShouldTakeTurn]);

  // WebSocket切断
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // 音声録音開始
  const startRecording = useCallback(async () => {
    if (!isConnected || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // AudioContextを作成（16kHzでリサンプリング）
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNodeを使って音声を取得
      // 256サンプルごとに処理（約16ms @ 16kHz）
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Float32を16bit PCMに変換
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64エンコードして送信
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(pcmData.buffer))
        );

        wsRef.current.send(
          JSON.stringify({
            type: "audio_chunk",
            audio_base64: base64,
            sample_rate: 16000,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      console.log("TurnTaking recording started");
    } catch (error) {
      console.error("Failed to start TurnTaking recording:", error);
    }
  }, [isConnected, isRecording]);

  // 音声録音停止
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    console.log("TurnTaking recording stopped");
  }, []);

  // バッファリセット
  const reset = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reset" }));
    }
    setPrediction(null);
  }, []);

  // コンポーネントマウント時に接続
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      stopRecording();
      disconnect();
    };
  }, [enabled, connect, disconnect, stopRecording]);

  return {
    isConnected,
    isVapAvailable,
    prediction,
    isRecording,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    reset,
  };
}

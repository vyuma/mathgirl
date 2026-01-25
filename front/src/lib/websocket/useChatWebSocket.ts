"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ChatMessage,
  ChatRequest,
  WSMessage,
  TextChunk,
  AudioChunk,
  CompleteMessage,
  ConnectionState,
} from "./types";

type UseChatWebSocketOptions = {
  url?: string;
  onTextChunk?: (chunk: TextChunk) => void;
  onAudioChunk?: (chunk: AudioChunk) => void;
  onComplete?: (message: CompleteMessage) => void;
  onError?: (error: string) => void;
};

// ブラウザ環境でWebSocket URLを動的に生成
function getDefaultWsUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8080/ws/chat";
  }
  // 現在のホストに基づいてWebSocket URLを生成
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat`;
}

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
  const {
    url,
    onTextChunk,
    onAudioChunk,
    onComplete,
    onError,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState("connecting");

    // URLが指定されていない場合は動的に生成
    const wsUrl = url || getDefaultWsUrl();
    console.log("WebSocket connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionState("connected");
      console.log("WebSocket connected");
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      console.log("WebSocket disconnected");
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionState("error");
      onError?.("WebSocket connection error");
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case "text_chunk":
            onTextChunk?.(message);
            break;
          case "audio_chunk":
            onAudioChunk?.(message);
            break;
          case "complete":
            onComplete?.(message);
            setIsProcessing(false);
            break;
          case "error":
            onError?.(message.message);
            setIsProcessing(false);
            break;
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    wsRef.current = ws;
  }, [url, onTextChunk, onAudioChunk, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("disconnected");
  }, []);

  const sendChatRequest = useCallback(
    (
      messages: ChatMessage[],
      speakerUuid: string,
      styleId: number,
      goal?: string
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        onError?.("WebSocket not connected");
        return false;
      }

      const request: ChatRequest = {
        type: "chat_request",
        messages,
        goal,
        speaker_uuid: speakerUuid,
        style_id: styleId,
      };

      setIsProcessing(true);
      wsRef.current.send(JSON.stringify(request));
      return true;
    },
    [onError]
  );

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    isProcessing,
    connect,
    disconnect,
    sendChatRequest,
    isConnected: connectionState === "connected",
  };
}

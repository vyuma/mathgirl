"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AudioChunk,
  BlackboardUpdate,
  ChatMessage,
  ChatRequest,
  CompleteMessage,
  ConnectionState,
  HintMessage,
  SocraticQuestion,
  SuggestOperation,
  TextChunk,
  UnderstandingUpdate,
  WSMessage,
} from "./types";

type UseChatWebSocketOptions = {
  url?: string;
  onTextChunk?: (chunk: TextChunk) => void;
  onAudioChunk?: (chunk: AudioChunk) => void;
  onComplete?: (message: CompleteMessage) => void;
  onError?: (error: string) => void;
  onBlackboardUpdate?: (data: BlackboardUpdate) => void;
  onSuggestOperation?: (data: SuggestOperation) => void;
  onHint?: (data: HintMessage) => void;
  onSocraticQuestion?: (data: SocraticQuestion) => void;
  onUnderstandingUpdate?: (data: UnderstandingUpdate) => void;
};

function getDefaultWsUrl(): string {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window === "undefined") {
    return "ws://localhost:8080/ws/chat";
  }
  // フォールバック: バックエンドポート8080を使用
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  return `${protocol}//${host}:8080/ws/chat`;
}

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
  const {
    url,
    onTextChunk,
    onAudioChunk,
    onComplete,
    onError,
    onBlackboardUpdate,
    onSuggestOperation,
    onHint,
    onSocraticQuestion,
    onUnderstandingUpdate,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState("connecting");

    const wsUrl = url || getDefaultWsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionState("connected");
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      wsRef.current = null;
    };

    ws.onerror = () => {
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
          case "blackboard_update":
            onBlackboardUpdate?.(message);
            break;
          case "suggest_operation":
            onSuggestOperation?.(message);
            break;
          case "hint":
            onHint?.(message);
            break;
          case "socratic_question":
            onSocraticQuestion?.(message);
            break;
          case "understanding_update":
            onUnderstandingUpdate?.(message);
            break;
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    wsRef.current = ws;
  }, [
    url,
    onTextChunk,
    onAudioChunk,
    onComplete,
    onError,
    onBlackboardUpdate,
    onSuggestOperation,
    onHint,
    onSocraticQuestion,
    onUnderstandingUpdate,
  ]);

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
      goal?: string,
      sessionId?: string,
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
        session_id: sessionId,
      };

      setIsProcessing(true);
      wsRef.current.send(JSON.stringify(request));
      return true;
    },
    [onError],
  );

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

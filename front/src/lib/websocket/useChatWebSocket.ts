"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnimationComplete,
  AnimationFailed,
  AnimationProgress,
  AnimationStarted,
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
  onAnimationStarted?: (data: AnimationStarted) => void;
  onAnimationProgress?: (data: AnimationProgress) => void;
  onAnimationComplete?: (data: AnimationComplete) => void;
  onAnimationFailed?: (data: AnimationFailed) => void;
};

function getDefaultWsUrl(): string {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window === "undefined") {
    return "ws://localhost:8080/ws/chat";
  }
  // nginx経由で接続（本番: wss://ani-math.jp/ws/chat）
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws/chat`;
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
  const intentionalCloseRef = useRef(false);
  const idTokenRef = useRef<string | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;

  // コールバックを最新の値で参照するためのref
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const connectInternal = useCallback((idToken?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // 既存の接続試行をクリーンアップ
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("connecting");

    let wsUrl = url || getDefaultWsUrl();
    if (idToken) {
      const sep = wsUrl.includes("?") ? "&" : "?";
      wsUrl = `${wsUrl}${sep}token=${encodeURIComponent(idToken)}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionState("connected");
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      wsRef.current = null;

      // 意図的な切断でなければ自動再接続
      if (!intentionalCloseRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectInternal(idTokenRef.current);
        }, delay);
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
      callbacksRef.current.onError?.("WebSocket connection error");
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        const cbs = callbacksRef.current;

        switch (message.type) {
          case "text_chunk":
            cbs.onTextChunk?.(message);
            break;
          case "audio_chunk":
            cbs.onAudioChunk?.(message);
            break;
          case "complete":
            cbs.onComplete?.(message);
            setIsProcessing(false);
            break;
          case "error":
            cbs.onError?.(message.message);
            setIsProcessing(false);
            break;
          case "blackboard_update":
            cbs.onBlackboardUpdate?.(message);
            break;
          case "suggest_operation":
            cbs.onSuggestOperation?.(message);
            break;
          case "hint":
            cbs.onHint?.(message);
            break;
          case "socratic_question":
            cbs.onSocraticQuestion?.(message);
            break;
          case "understanding_update":
            cbs.onUnderstandingUpdate?.(message);
            break;
          case "animation_started":
            cbs.onAnimationStarted?.(message);
            break;
          case "animation_progress":
            cbs.onAnimationProgress?.(message);
            break;
          case "animation_complete":
            cbs.onAnimationComplete?.(message);
            break;
          case "animation_failed":
            cbs.onAnimationFailed?.(message);
            break;
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    wsRef.current = ws;
  }, [url]);

  const connect = useCallback((idToken?: string) => {
    intentionalCloseRef.current = false;
    idTokenRef.current = idToken;
    reconnectAttemptsRef.current = 0;
    connectInternal(idToken);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;

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
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    connectionState,
    isProcessing,
    connect,
    disconnect,
    sendChatRequest,
    isConnected: connectionState === "connected",
  };
}

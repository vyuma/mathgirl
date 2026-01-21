// WebSocket メッセージ型定義

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// クライアント → サーバー
export type ChatRequest = {
  type: "chat_request";
  messages: ChatMessage[];
  goal?: string;
  speaker_uuid: string;
  style_id: number;
};

// サーバー → クライアント
export type TextChunk = {
  type: "text_chunk";
  index: number;
  text: string;
  is_partial: boolean;
};

export type AudioChunk = {
  type: "audio_chunk";
  index: number;
  audio_base64: string;
};

export type CompleteMessage = {
  type: "complete";
  full_text: string;
};

export type ErrorMessage = {
  type: "error";
  message: string;
};

export type WSMessage = TextChunk | AudioChunk | CompleteMessage | ErrorMessage;

// 接続状態
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

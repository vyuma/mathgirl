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
  session_id?: string;
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

export type BlackboardUpdate = {
  type: "blackboard_update";
  latex: string;
  explanation: string;
};

export type SuggestOperation = {
  type: "suggest_operation";
  latex: string;
  operation: string;
  explanation: string;
};

export type HintMessage = {
  type: "hint";
  hint_text: string;
  related_latex: string | null;
};

export type SocraticQuestion = {
  type: "socratic_question";
  question_text: string;
  question_if_correct: string;
  question_if_stuck: string;
  visual_hint_latex: string | null;
  current_understanding_level: number;
};

export type UnderstandingUpdate = {
  type: "understanding_update";
  level: number;
  reasoning: string;
  topic: string;
};

export type WSMessage =
  | TextChunk
  | AudioChunk
  | CompleteMessage
  | ErrorMessage
  | BlackboardUpdate
  | SuggestOperation
  | HintMessage
  | SocraticQuestion
  | UnderstandingUpdate;

// 接続状態
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

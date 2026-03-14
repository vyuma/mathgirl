/**
 * VRMアバターの表情定義
 *
 * VRM標準プリセット表情 + カスタム表情に対応。
 * expressionManager.setValue() で 0〜1 の値を設定する。
 */

export type ExpressionName =
  | "happy"
  | "smile"
  | "sad"
  | "angry"
  | "surprised"
  | "relaxed"
  | "neutral";

export type ActiveExpression = {
  /** expressionManager に渡すキー */
  key: string;
  /** 目標値 (0〜1) */
  targetValue: number;
  /** 現在の補間値 */
  currentValue: number;
  /**
   * 表情を保持するミリ秒。
   * 0 = 明示的に clearExpression() するまでキープ
   */
  holdDuration: number;
  startTime: number;
};

export type ExpressionDef = {
  /** expressionManager のキー */
  key: string;
  /** デフォルトの強度 */
  defaultValue: number;
  /** デフォルトの保持時間 (ms)。0 = キープ */
  defaultHoldDuration: number;
};

export const expressions: Record<ExpressionName, ExpressionDef> = {
  happy: {
    key: "happy",
    defaultValue: 1.0,
    defaultHoldDuration: 3000,
  },
  /** 微笑み: happy を抑えた自然な笑顔、キープ */
  smile: {
    key: "happy",
    defaultValue: 0.1,
    defaultHoldDuration: 0,
  },
  sad: {
    key: "sad",
    defaultValue: 0.8,
    defaultHoldDuration: 3000,
  },
  angry: {
    key: "angry",
    defaultValue: 0.9,
    defaultHoldDuration: 2000,
  },
  surprised: {
    key: "surprised",
    defaultValue: 1.0,
    defaultHoldDuration: 1500,
  },
  relaxed: {
    key: "relaxed",
    defaultValue: 0.8,
    defaultHoldDuration: 0,
  },
  neutral: {
    key: "neutral",
    defaultValue: 0,
    defaultHoldDuration: 0,
  },
};

/** 補間速度（1秒あたりの変化量） */
export const EXPRESSION_LERP_SPEED = 4.0;

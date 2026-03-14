/**
 * VRMアバターのモーション定義
 *
 * 各モーションは progress (0〜1) を受け取り、
 * ベースポーズへのオフセット（ラジアン）を返す。
 */

export type MotionName = "headTiltLeft" | "headTiltRight" | "nod" | "think";

export type BoneRotation = { x?: number; y?: number; z?: number };

export type ArmBones = {
  upperArm?: BoneRotation;
  lowerArm?: BoneRotation;
  hand?: BoneRotation;
};

export type MotionBones = {
  head?: BoneRotation;
  neck?: BoneRotation;
  spine?: BoneRotation;
  rightArm?: ArmBones;
  leftArm?: ArmBones;
};

export type MotionDef = {
  duration: number; // ミリ秒
  getBones: (progress: number) => MotionBones;
};

export type ActiveMotion = {
  def: MotionDef;
  startTime: number;
};

// ─── イージング関数 ───────────────────────────────────────────

/** 通常のeaseInOut */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * スプリングイージング: 少しオーバーシュートして自然に収束する
 * overshoot が大きいほど弾む
 */
function springEase(t: number, overshoot = 1.5): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-t * 6) * Math.cos(t * overshoot * Math.PI);
}

/**
 * 指定範囲 [start, end] 内での進捗を 0〜1 に正規化
 * ボーンのスタガー（遅延開始）に使う
 */
function remap(p: number, start: number, end: number): number {
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}

// ─── モーション定義 ─────────────────────────────────────────────

export const motions: Record<MotionName, MotionDef> = {
  /** 首を左に傾ける */
  headTiltLeft: {
    duration: 2000,
    getBones: (p) => {
      let tilt = 0;
      if (p < 0.25) tilt = easeInOut(p / 0.25) * 0.35;
      else if (p < 0.75) tilt = 0.35;
      else tilt = easeInOut(1 - (p - 0.75) / 0.25) * 0.35;
      return { head: { z: tilt } };
    },
  },

  /** 首を右に傾ける */
  headTiltRight: {
    duration: 2000,
    getBones: (p) => {
      let tilt = 0;
      if (p < 0.25) tilt = easeInOut(p / 0.25) * 0.35;
      else if (p < 0.75) tilt = 0.35;
      else tilt = easeInOut(1 - (p - 0.75) / 0.25) * 0.35;
      return { head: { z: -tilt } };
    },
  },

  /** うなずく */
  nod: {
    duration: 1500,
    getBones: (p) => {
      const envelope = Math.sin(p * Math.PI);
      const nod = Math.sin(p * Math.PI * 4) * 0.18 * envelope;
      return { head: { x: nod } };
    },
  },

  /**
   * 考えるポーズ: 右手をほっぺに添える
   *
   * 自然さのポイント:
   * - 肩 → 肘 → 手首 の順にスタガーして動く（連鎖的）
   * - スプリングイージングで少し弾んで止まる
   * - ホールド中に頭が微妙に揺れる
   * - 戻りは逆順（手首 → 肘 → 肩）で少し速く
   *
   * ベースポーズ:
   *   rightUpperArm z=-1.3, x=0.1
   *   rightLowerArm x=0.1
   *   rightHand     y=0.1,  z=0.01
   */
  think: {
    duration: 6000,
    getBones: (p) => {
      // ── フェーズ分割 ──────────────────────────────
      // 0.00〜0.35: 腕を持ち上げてほっぺへ（スタガー）
      // 0.35〜0.75: ホールド（頭の微揺れ）
      // 0.75〜1.00: 腕を戻す（逆順スタガー）

      const isReturn = p > 0.75;
      const rp = isReturn ? remap(p, 0.75, 1.0) : 0; // 戻り進捗 0〜1

      // ── 持ち上げフェーズ: 肩→肘→手首 の順に動く ──
      // スタガーの開始タイミングをずらす
      const upperArmIn = springEase(remap(p, 0.00, 0.28), 1.2);
      const lowerArmIn = springEase(remap(p, 0.06, 0.32), 1.0);
      const handIn     = springEase(remap(p, 0.12, 0.36), 0.8);
      const headIn     = springEase(remap(p, 0.08, 0.30), 0.6);

      // ── 戻りフェーズ: 手首→肘→肩 の逆順 ──
      const handOut     = isReturn ? easeInOut(remap(rp, 0.00, 0.60)) : 0;
      const lowerArmOut = isReturn ? easeInOut(remap(rp, 0.15, 0.75)) : 0;
      const upperArmOut = isReturn ? easeInOut(remap(rp, 0.30, 1.00)) : 0;
      const headOut     = isReturn ? easeInOut(remap(rp, 0.10, 0.80)) : 0;

      // ── ブレンド値（持ち上げ - 戻り） ──
      const ua = upperArmIn - upperArmOut;
      const la = lowerArmIn - lowerArmOut;
      const ha = handIn     - handOut;
      const hd = headIn     - headOut;

      // ── ホールド中の微揺れ（考えてる感） ──
      const holdFactor = Math.max(0, Math.min(1, (p - 0.35) / 0.1)) *
                         Math.max(0, Math.min(1, (0.75 - p) / 0.1));
      const wobble = holdFactor * Math.sin(p * Math.PI * 8) * 0.012;

      return {
        head: {
          z: -0.13 * hd,
          x:  0.04 * hd + wobble,
        },
        rightArm: {
          // 目標: upperArm z=-0.2（+1.1）, x=1.0（+0.9）
          upperArm: { z: 1.1 * ua, x: 0.9 * ua },
          // 目標: lowerArm x=2.1（+2.0）
          lowerArm: { x: 2.0 * la },
          // 目標: hand y=-0.4（-0.5）, z=0.21（+0.2）
          hand: { y: -0.5 * ha, z: 0.2 * ha },
        },
      };
    },
  },
};

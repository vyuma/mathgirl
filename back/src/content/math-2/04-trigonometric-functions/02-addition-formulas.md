---
title: "加法定理"
subject: "数学II"
unit: "三角関数"
topic: "加法定理と関連公式"
difficulty: "標準"
prerequisites: ["../../math-1/04-trigonometric-ratios/01-trigonometric-ratios.md"]
tags: ["加法定理", "三角関数", "倍角公式", "半角公式", "和積変換"]
---

# 加法定理

## 導入

加法定理は三角関数の最も重要な公式です。2倍角の公式、半角の公式、三角関数の合成など、多くの公式が加法定理から導かれます。入試では直接問われるだけでなく、さまざまな問題の途中で必要になります。

「加法定理さえ覚えていれば、他の公式は導ける」と言われるほど、三角関数の中心的な公式です。

## 基本事項

### 加法定理

$$
\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta
$$

$$
\sin(\alpha - \beta) = \sin\alpha\cos\beta - \cos\alpha\sin\beta
$$

$$
\cos(\alpha + \beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta
$$

$$
\cos(\alpha - \beta) = \cos\alpha\cos\beta + \sin\alpha\sin\beta
$$

$$
\tan(\alpha + \beta) = \frac{\tan\alpha + \tan\beta}{1 - \tan\alpha\tan\beta}
$$

$$
\tan(\alpha - \beta) = \frac{\tan\alpha - \tan\beta}{1 + \tan\alpha\tan\beta}
$$

### 2倍角の公式

加法定理で $\beta = \alpha$ とすると導けます:

$$
\sin 2\alpha = 2\sin\alpha\cos\alpha
$$

$$
\cos 2\alpha = \cos^2\alpha - \sin^2\alpha = 2\cos^2\alpha - 1 = 1 - 2\sin^2\alpha
$$

$$
\tan 2\alpha = \frac{2\tan\alpha}{1 - \tan^2\alpha}
$$

### 半角の公式

2倍角の公式から導けます:

$$
\sin^2\frac{\alpha}{2} = \frac{1 - \cos\alpha}{2}
$$

$$
\cos^2\frac{\alpha}{2} = \frac{1 + \cos\alpha}{2}
$$

## 例題

### 例題1（基礎: 加法定理の直接適用）

**問題**: $\sin 75°$ の値を求めよ。

**解説**:

$75° = 45° + 30°$ と分解して加法定理を使います:

$$
\begin{aligned}
\sin 75° &= \sin(45° + 30°) \\
&= \sin 45°\cos 30° + \cos 45°\sin 30° \\
&= \frac{\sqrt{2}}{2} \cdot \frac{\sqrt{3}}{2} + \frac{\sqrt{2}}{2} \cdot \frac{1}{2} \\
&= \frac{\sqrt{6} + \sqrt{2}}{4}
\end{aligned}
$$

### 例題2（標準: 2倍角の公式）

**問題**: $\sin\theta = \dfrac{3}{5}$（$0 < \theta < \dfrac{\pi}{2}$）のとき、$\sin 2\theta$, $\cos 2\theta$ を求めよ。

**解説**:

$\sin^2\theta + \cos^2\theta = 1$ より:

$$
\cos\theta = \sqrt{1 - \frac{9}{25}} = \frac{4}{5} \quad (\cos\theta > 0)
$$

2倍角の公式:

$$
\sin 2\theta = 2\sin\theta\cos\theta = 2 \cdot \frac{3}{5} \cdot \frac{4}{5} = \frac{24}{25}
$$

$$
\cos 2\theta = 1 - 2\sin^2\theta = 1 - 2 \cdot \frac{9}{25} = \frac{7}{25}
$$

### 例題3（標準: tan の加法定理）

**問題**: $\tan\alpha = 2$, $\tan\beta = 3$ のとき、$\tan(\alpha + \beta)$ を求めよ。

**解説**:

$$
\tan(\alpha + \beta) = \frac{\tan\alpha + \tan\beta}{1 - \tan\alpha\tan\beta} = \frac{2 + 3}{1 - 2 \cdot 3} = \frac{5}{-5} = -1
$$

## つまずきやすいポイント

- **$\cos$ の加法定理の符号**: $\cos(\alpha + \beta)$ は引き算（$\cos\alpha\cos\beta \boldsymbol{-} \sin\alpha\sin\beta$）。$\sin$ と逆
- **2倍角 $\cos 2\alpha$ の3つの形**: 問題に合わせて使い分ける。$\sin$ だけの式にしたいなら $1 - 2\sin^2\alpha$、$\cos$ だけにしたいなら $2\cos^2\alpha - 1$
- **角度の分解**: $75° = 45° + 30°$、$15° = 45° - 30°$ など、特殊角の組み合わせを見つける
- **$\tan$ の加法定理の分母**: $1 - \tan\alpha\tan\beta = 0$ のときは定義されない（$\alpha + \beta = 90°$ のとき）

## まとめ

- 加法定理は三角関数の最重要公式。まずこれを確実に覚える
- 2倍角の公式、半角の公式は加法定理から導ける
- $\cos$ の加法定理は符号に注意（$+$ の中身が $-$）
- 未知の三角比は $\sin^2\theta + \cos^2\theta = 1$ で求める

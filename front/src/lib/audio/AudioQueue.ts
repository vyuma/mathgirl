/**
 * 順序保証付き音声キュー
 *
 * WebSocketから届く音声チャンクを受け取り、
 * インデックス順に再生を保証する
 */
export class AudioQueue {
  private queue: Map<number, ArrayBuffer> = new Map();
  private nextIndex = 0;
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private onPlayingChange?: (isPlaying: boolean) => void;
  private onSentenceStart?: (index: number) => void;
  private onSentenceEnd?: (index: number) => void;

  constructor(options?: {
    onPlayingChange?: (isPlaying: boolean) => void;
    onSentenceStart?: (index: number) => void;
    onSentenceEnd?: (index: number) => void;
  }) {
    this.onPlayingChange = options?.onPlayingChange;
    this.onSentenceStart = options?.onSentenceStart;
    this.onSentenceEnd = options?.onSentenceEnd;
  }

  /**
   * AudioContextを初期化（ユーザー操作後に呼ぶ必要がある）
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Base64エンコードされた音声データをキューに追加
   */
  async addAudio(index: number, audioBase64: string): Promise<void> {
    // Base64をArrayBufferに変換
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioData = bytes.buffer;

    this.queue.set(index, audioData);

    // 再生処理を開始
    await this.processQueue();
  }

  /**
   * キューを処理して順序通りに再生
   */
  private async processQueue(): Promise<void> {
    // 既に再生中なら何もしない
    if (this.isPlaying) {
      return;
    }

    // 次のインデックスの音声がキューにあるか確認
    while (this.queue.has(this.nextIndex)) {
      this.isPlaying = true;
      this.onPlayingChange?.(true);

      const audioData = this.queue.get(this.nextIndex)!;
      this.queue.delete(this.nextIndex);

      try {
        this.onSentenceStart?.(this.nextIndex);
        await this.playAudio(audioData);
        this.onSentenceEnd?.(this.nextIndex);
      } catch (error) {
        console.error(`Failed to play audio at index ${this.nextIndex}:`, error);
      }

      this.nextIndex++;
    }

    this.isPlaying = false;
    this.onPlayingChange?.(false);
  }

  /**
   * 音声データを再生
   */
  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.init();
    }

    const context = this.audioContext!;

    // AudioContextがsuspended状態の場合はresumeする
    if (context.state === "suspended") {
      await context.resume();
    }

    // ArrayBufferをデコード
    const audioBuffer = await context.decodeAudioData(audioData.slice(0));

    return new Promise((resolve, reject) => {
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);

      source.onended = () => {
        resolve();
      };

      source.onerror = (error) => {
        reject(error);
      };

      source.start(0);
    });
  }

  /**
   * キューをリセット
   */
  reset(): void {
    this.queue.clear();
    this.nextIndex = 0;
    this.isPlaying = false;
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.reset();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * 現在再生中かどうか
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * キューに溜まっている音声の数
   */
  get queueSize(): number {
    return this.queue.size;
  }
}

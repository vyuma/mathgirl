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
      console.log("AudioQueue.init: Creating new AudioContext");
      this.audioContext = new AudioContext();
      console.log(
        "AudioQueue.init: AudioContext created, state:",
        this.audioContext.state,
      );
    } else {
      console.log(
        "AudioQueue.init: AudioContext already exists, state:",
        this.audioContext.state,
      );
    }
  }

  /**
   * Base64エンコードされた音声データをキューに追加
   */
  async addAudio(index: number, audioBase64: string): Promise<void> {
    console.log(
      `AudioQueue: Adding audio chunk ${index}, base64 length: ${audioBase64.length}`,
    );

    // Base64をArrayBufferに変換
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioData = bytes.buffer;
    console.log(
      `AudioQueue: Decoded audio chunk ${index}, size: ${audioData.byteLength} bytes`,
    );

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
        console.error(
          `Failed to play audio at index ${this.nextIndex}:`,
          error,
        );
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
    console.log(
      "AudioQueue: playAudio called, data size:",
      audioData.byteLength,
    );

    if (!this.audioContext) {
      console.log("AudioQueue: Initializing AudioContext");
      this.init();
    }

    const context = this.audioContext!;
    console.log("AudioQueue: AudioContext state:", context.state);

    // AudioContextがsuspended状態の場合はresumeする
    if (context.state === "suspended") {
      console.log("AudioQueue: Resuming suspended AudioContext");
      await context.resume();
    }

    try {
      // ArrayBufferをデコード
      console.log("AudioQueue: Decoding audio data...");
      const audioBuffer = await context.decodeAudioData(audioData.slice(0));
      console.log(
        "AudioQueue: Audio decoded, duration:",
        audioBuffer.duration,
        "seconds",
      );

      return new Promise((resolve, reject) => {
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);

        source.onended = () => {
          console.log("AudioQueue: Audio playback ended");
          resolve();
        };

        console.log("AudioQueue: Starting audio playback");
        try {
          source.start(0);
        } catch (error) {
          console.error("AudioQueue: Audio playback error:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("AudioQueue: Failed to decode or play audio:", error);
      throw error;
    }
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

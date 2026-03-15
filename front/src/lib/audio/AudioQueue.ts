/**
 * 順序保証付き音声キュー
 *
 * WebSocketから届く音声チャンクを受け取り、
 * インデックス順に再生を保証する
 *
 * プロトコル:
 *   - is_final=false : 同一インデックスのWAVフラグメント（蓄積する）
 *   - is_final=true  : 終端マーカー（全フラグメントを結合して再生キューに追加）
 */
export class AudioQueue {
  private queue: Map<number, ArrayBuffer> = new Map();
  // 受信中のフラグメントを index ごとに蓄積する
  private chunkBuffers: Map<number, Uint8Array[]> = new Map();
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
   * Base64エンコードされた音声チャンクを受け取る。
   *
   * @param index     文のインデックス
   * @param audioBase64 Base64エンコードされたWAVフラグメント（終端マーカー時は空文字）
   * @param isFinal   true のとき全フラグメントを結合して再生キューへ追加する
   */
  async addAudio(
    index: number,
    audioBase64: string,
    isFinal: boolean,
  ): Promise<void> {
    // フラグメントを蓄積
    if (audioBase64) {
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!this.chunkBuffers.has(index)) {
        this.chunkBuffers.set(index, []);
      }
      this.chunkBuffers.get(index)!.push(bytes);
    }

    // is_final=true のとき全フラグメントを結合して再生キューへ
    if (isFinal) {
      const fragments = this.chunkBuffers.get(index) ?? [];
      this.chunkBuffers.delete(index);

      if (fragments.length === 0) {
        console.warn(`AudioQueue: index ${index} has no fragments, skipping`);
        return;
      }

      const totalLength = fragments.reduce((sum, f) => sum + f.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const frag of fragments) {
        combined.set(frag, offset);
        offset += frag.length;
      }

      console.log(
        `AudioQueue: index ${index} assembled, ${fragments.length} fragments, ${totalLength} bytes`,
      );
      this.queue.set(index, combined.buffer);
      await this.processQueue();
    }
  }

  /**
   * キューを処理して順序通りに再生
   */
  private async processQueue(): Promise<void> {
    if (this.isPlaying) {
      return;
    }

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

    if (context.state === "suspended") {
      console.log("AudioQueue: Resuming suspended AudioContext");
      await context.resume();
    }

    try {
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
    this.chunkBuffers.clear();
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

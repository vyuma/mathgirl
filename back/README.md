# Backend

FastAPI + LangChain によるリアルタイム数学チュータリングバックエンド。

## AI実装

### 概要

AIエージェント「みくる」がソクラテス式対話で数学を教える。
LLMはすべてのアクションを **Function Calling（ツール呼び出し）** で表現し、テキスト直接出力は行わない。

### ファイル構成

```
back/src/
├── agent/session_chat/
│   ├── agent.py      # SessionAgent: LLM呼び出し・ツール実行・ストリーミング
│   ├── prompt.py     # システムプロンプト（みくるの口調・ツール使用ルール）
│   └── tools.py      # LangChain ツール定義（speak / write_to_blackboard 等）
│
├── service/tts/
│   ├── streaming_tts.py      # TTSオーケストレーター（キュー方式並列処理）
│   └── coeiroink_client.py   # COEIROINK API クライアント
│
├── model/speak_chat/
│   └── chat.py       # WebSocketメッセージ型定義（AudioChunk / TextChunk 等）
│
└── router/speak_chat/
    └── chat_ws.py    # WebSocketエンドポイント /ws/chat
```

### ツール一覧

| ツール | 役割 |
|--------|------|
| `speak` | 音声合成に渡すテキスト（数式禁止・短文） |
| `write_to_blackboard` | 黒板にLaTeX数式を表示 |
| `pose_question` | ソクラテス式の問い（正解時・詰まり時の次の問いも含む） |
| `suggest_operation` | 式操作（展開・因数分解等）を提案 |
| `estimate_understanding` | 学習者の理解度を0〜5で評価・更新 |
| `estimate_emotion` | 学習者の感情状態を推定してキャラクター表情を更新 |
| `generate_animation` | 数学的概念のアニメーション生成をリクエスト |
| `edit_animation` | 既存アニメーションの編集をリクエスト |

### ReActストリーミングパイプライン

`SessionAgent.stream_react()` を中心とした処理フロー：

```
1. LLMレスポンス取得（astream_events でストリーミング受信）
      ↓
2. speak ツール呼び出しを先に実行・yield
      ↓（speak受信と同時に）
3. TTSキューへの流し込みタスクを並列起動（synthesize_stream）
      ↓（並列）
4. blackboard / emotion / question 等の残ツールを実行・yield
      ↓（各イテレーション後）
5. 完成済み音声キューを早期フラッシュ → AudioChunk を WebSocket へ送信
      ↓（ループ終了後）
6. 残りのキューを順番に drain して最終 AudioChunk を送信
      ↓
7. CompleteMessage 送信
```

#### 高レスポンス化のポイント

- **speakを最優先**: LLMレスポンス確定後、`speak` のみ先に yield することで TTS を他ツールより先に起動
- **並列TTS**: speak が複数ある場合、全ての TTS HTTPリクエストを `asyncio.create_task` で同時に走らせる
- **早期フラッシュ**: `stream_react` ループの各イテレーション後に完成済みのキューをノンブロッキングで確認し、完成次第 `AudioChunk` を送信
- **HTTPストリーミング**: `CoeiroinkClient.synthesize_stream()` が `httpx.stream()` でチャンク単位取得。COEIROINK がチャンク転送対応なら合成中から音声データが届く

### WebSocketメッセージ型

クライアントへ送信されるメッセージの種別（`type` フィールドで判別）：

| type | 内容 |
|------|------|
| `text_chunk` | テキスト断片（speak のテキスト） |
| `audio_chunk` | 音声データ（Base64 WAV）。`is_final=false` は部分チャンク |
| `blackboard_update` | 黒板に表示するLaTeX数式 |
| `socratic_question` | ソクラテス式の問い（正解・詰まり時の分岐付き） |
| `suggest_operation` | 式操作の提案 |
| `understanding_update` | 理解度更新（0〜5） |
| `emotion_update` | 感情状態更新（joy / thinking / confused / encouraging / neutral） |
| `animation_started` | アニメーション生成開始 |
| `animation_progress` | 生成進捗 |
| `animation_complete` | 生成完了（video_url付き） |
| `animation_failed` | 生成失敗 |
| `complete` | レスポンス完了 |
| `error` | エラー |

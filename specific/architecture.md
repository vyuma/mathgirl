# MathGirl アーキテクチャ図

## 全体構成

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser                                     │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  VRMChat     │  │ DialogLog    │  │ NotePanel    │  │BlackBoard│ │
│  │  (3Dアバター) │  │ Panel        │  │ (MathLive)   │  │ (KaTeX)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                 │                │       │
│  ┌──────┴─────────────────┴─────────────────┴────────────────┴─────┐ │
│  │                     Zustand Stores                              │ │
│  │  dialogStore │ sessionStore │ noteStore │ blackboardStore │ ... │ │
│  └──────┬─────────────────┬─────────────────┬──────────────────────┘ │
│         │                 │                 │                        │
│  ┌──────┴─────────────────┴─────────────────┴──────────────────────┐ │
│  │                     useChat (統合フック)                          │ │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────┐            │ │
│  │  │useSpeech    │ │useChatWeb    │ │useStreaming     │            │ │
│  │  │Recognition  │ │Socket        │ │Audio            │            │ │
│  │  │(STT)        │ │(WS通信)      │ │(音声再生)       │            │ │
│  │  └─────────────┘ └──────┬───────┘ └────────────────┘            │ │
│  └─────────────────────────┼───────────────────────────────────────┘ │
│                            │                                         │
│  ┌─────────────────────────┼───────────────────────────────────────┐ │
│  │              authFetch / NextAuth (認証)                         │ │
│  │  Google OAuth → id_token → Bearer Header / WS ?token=           │ │
│  └─────────────────────────┼───────────────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │ REST (proxy)     │ WebSocket (直接)  │
          │ /api/backend/*   │ ws://:8080/ws/*   │
          ▼                  ▼                   │
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js Server (Port 3030)                       │
│  ┌──────────────────────────────────┐                                │
│  │ Rewrites: /api/backend/* → back  │  (REST プロキシのみ)           │
│  └──────────────────────────────────┘                                │
│  ┌──────────────────────────────────┐                                │
│  │ Middleware (proxy.ts)            │  未認証 → /signin リダイレクト  │
│  └──────────────────────────────────┘                                │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ http://back:8080/api/*
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (Port 8080)                       │
│                                                                      │
│  ┌─── 認証レイヤー ──────────────────────────────────────────────┐   │
│  │ auth/dependencies.py                                          │   │
│  │  get_current_user()  ← REST: Authorization: Bearer <id_token> │   │
│  │  verify_ws_token()   ← WS: ?token=<id_token>                 │   │
│  │  ↓                                                            │   │
│  │ auth/google_verify.py                                         │   │
│  │  google.oauth2.id_token.verify_oauth2_token()                 │   │
│  │  → sub, email, name, picture                                  │   │
│  │  ↓                                                            │   │
│  │ UserRepository.find_or_create_by_google()                     │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── ルーター ──────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  REST API (/api/*)                                            │   │
│  │  ├── sessions.py   POST/GET/PATCH /sessions      (認証+所有者)│   │
│  │  ├── notes.py      GET/PUT /sessions/:id/note    (認証+所有者)│   │
│  │  ├── chat.py       POST /chat (REST フォールバック)           │   │
│  │  ├── speakers.py   GET /speakers                              │   │
│  │  └── synthesis.py  POST /synthesis                            │   │
│  │                                                               │   │
│  │  WebSocket                                                    │   │
│  │  ├── chat_ws.py       /ws/chat          (トークン認証+所有者) │   │
│  │  └── turntaking_ws.py /ws/turntaking                          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── サービス層 ────────────────────────────────────────────────┐   │
│  │  StreamingTTS                                                 │   │
│  │  ├── SessionAgent.stream_sentences() → テキスト生成           │   │
│  │  └── CoeiroinkClient.synthesize()    → 並列音声合成           │   │
│  │                                                               │   │
│  │  TurnTakingPredictor (ターンテイキング予測)                    │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── AIエージェント層 ──────────────────────────────────────────┐   │
│  │  SessionAgent (LangChain + Gemini 2.5 Flash)                  │   │
│  │  ├── Tool: blackboard_update    → 数式を黒板に表示            │   │
│  │  ├── Tool: suggest_operation    → 演算の提案                  │   │
│  │  ├── Tool: socratic_question    → ソクラテス的問いかけ        │   │
│  │  └── Tool: understanding_update → 理解度レベル更新            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─── データベース層 ────────────────────────────────────────────┐   │
│  │  SQLAlchemy 2.0 Async + asyncpg                               │   │
│  │  Repository パターン:                                         │   │
│  │  ├── UserRepository       (find_or_create_by_google)          │   │
│  │  ├── SessionRepository    (CRUD + list_by_user)               │   │
│  │  ├── MessageRepository    (create + list_by_session)          │   │
│  │  └── NoteRepository       (upsert + get_by_session)          │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL 17 (Port 5450)                        │
│                                                                      │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  ┌──────┐  ┌─────┐ │
│  │  users   │←─│ sessions │←─│ dialog_messages │  │notes │  │texts│ │
│  │          │  │          │  │                 │  │      │  │     │ │
│  │ user_id  │  │session_id│  │ message_id      │  │note_id│ │text_│ │
│  │ google_id│  │ user_id  │  │ session_id      │  │sess_ │  │ id  │ │
│  │ email    │  │ title    │  │ role            │  │user_ │  │sess_│ │
│  │ user_name│  │ status   │  │ content         │  │blocks│  │user_│ │
│  │ avatar   │  │ text_    │  │ content_type    │  │text  │  │cont │ │
│  │          │  │  content │  │ metadata        │  │ver.  │  │     │ │
│  └─────────┘  └──────────┘  └─────────────────┘  └──────┘  └─────┘ │
└─────────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────────┐
│                     外部サービス                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Google Gemini API │  │ COEIROINK (TTS)  │  │ Google OAuth 2.0 │  │
│  │ (LLM生成)        │  │ (音声合成)        │  │ (認証)           │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## データフロー（1ターンの会話）

```
 ユーザー発話
     │
     ▼
 Web Speech API (continuous, autoRestart)
     │ transcript
     ▼
 useChat.handleSend()
     │ stopListening() + clearTranscript()
     │
     ▼
 useChatWebSocket.sendChatRequest()
     │ JSON: { type, messages[], speaker_uuid, session_id }
     │
     ▼ WebSocket (/ws/chat?token=<idToken>)
     │
 ┌───┴───────────────────────────────────────────┐
 │ Backend chat_ws.py                             │
 │                                                │
 │  1. verify_ws_token() → User                   │
 │  2. session 所有者チェック                       │
 │  3. _save_message(user, ...)                    │
 │  4. SessionAgent.stream_sentences()             │
 │     ├─ Gemini 2.5 Flash (LLM)                  │
 │     └─ Tool calling (黒板/提案/問い/理解度)      │
 │  5. CoeiroinkClient.synthesize() (並列)         │
 │                                                │
 │  Stream response:                               │
 │  ├─ TextChunk { index, text }        ──────┐   │
 │  ├─ AudioChunk { index, audio_base64 } ──┐ │   │
 │  ├─ BlackboardUpdate { latex }       ──┐ │ │   │
 │  ├─ SocraticQuestion { ... }       ─┐ │ │ │   │
 │  ├─ UnderstandingUpdate { level }  ┐ │ │ │ │   │
 │  └─ CompleteMessage { full_text } ─┼─┼─┼─┼─┼─► │
 └────────────────────────────────────┼─┼─┼─┼─┼───┘
                                      │ │ │ │ │
 ┌────────────────────────────────────┼─┼─┼─┼─┼───┐
 │ Frontend message handlers          │ │ │ │ │   │
 │                                    ▼ ▼ ▼ ▼ ▼   │
 │  understandingStore.setLevel()  ◄──┘ │ │ │ │   │
 │  setPendingQuestion()           ◄────┘ │ │ │   │
 │  blackboardStore.addFormula()   ◄──────┘ │ │   │
 │  AudioQueue.addAudio()          ◄────────┘ │   │
 │  dialogStore.setStreamingText() ◄──────────┘   │
 │                                                 │
 │  CompleteMessage 受信:                           │
 │  ├─ dialogStore.addMessage(assistant)           │
 │  ├─ clearStreaming()                            │
 │  └─ isTurnComplete = true                       │
 │                                                 │
 │  音声再生完了 (isPlaying=false):                  │
 │  └─ startListening() → 音声認識再開              │
 └─────────────────────────────────────────────────┘
```

---

## 認証フロー

```
 ブラウザ                    Next.js Server              FastAPI Backend
    │                            │                            │
    │  Google Sign-In            │                            │
    ├──────────────────────────► │                            │
    │                            │  Google OAuth 2.0          │
    │                            ├──────────────► Google      │
    │                            │ ◄──────────── id_token     │
    │                            │               refresh_token│
    │                            │                            │
    │  NextAuth Session          │                            │
    │  (jwt: idToken,            │                            │
    │   refreshToken, expiresAt) │                            │
    │ ◄──────────────────────────┤                            │
    │                            │                            │
    │  REST: authFetch()         │                            │
    │  Authorization: Bearer     │  Proxy                     │
    │  <idToken>                 │  /api/backend/* →          │
    ├──────────────────────────► ├──────────────────────────► │
    │                            │                            │
    │                            │    get_current_user()      │
    │                            │    verify_google_id_token()│
    │                            │    find_or_create_by_google│
    │                            │    → User                  │
    │                            │ ◄──────────────────────────┤
    │                            │                            │
    │  WS: ?token=<idToken>      │                            │
    ├────────────────────────────┼──────────────────────────► │
    │  (直接接続: port 8080)     │    verify_ws_token()       │
    │                            │    → User or close(4001)   │
    │                            │                            │
    │  トークン期限切れ 5分前      │                            │
    │  jwt callback →            │                            │
    │  Google refresh endpoint   │                            │
    │  → 新 id_token             │                            │
```

---

## ディレクトリ構造

```
mathgirl/
├── back/
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── src/
│       ├── main.py                        # FastAPI アプリ初期化
│       ├── auth/                          # 認証
│       │   ├── google_verify.py           #   Google ID token 検証
│       │   └── dependencies.py            #   FastAPI 依存関数
│       ├── agent/                         # AI エージェント
│       │   ├── original_chat/             #   初期版エージェント
│       │   └── session_chat/              #   セッション対応エージェント
│       │       ├── agent.py               #     SessionAgent (LangChain)
│       │       ├── prompt.py              #     システムプロンプト
│       │       └── tools.py               #     ツール定義
│       ├── db/                            # データベース
│       │   ├── engine.py                  #   SQLAlchemy エンジン
│       │   ├── dependencies.py            #   get_db 依存関数
│       │   ├── models/                    #   ORM モデル
│       │   │   ├── user.py
│       │   │   ├── session.py
│       │   │   ├── message.py
│       │   │   ├── note.py
│       │   │   └── text.py
│       │   └── repositories/              #   Repository パターン
│       │       ├── user_repo.py
│       │       ├── session_repo.py
│       │       ├── message_repo.py
│       │       └── note_repo.py
│       ├── model/                         # Pydantic スキーマ
│       │   ├── session.py                 #   Session/Message/Note DTO
│       │   └── speak_chat/
│       │       ├── chat.py                #   WS メッセージ型
│       │       └── speaker.py
│       ├── router/                        # API ルーター
│       │   ├── sessions/sessions.py       #   セッション CRUD
│       │   ├── notes/notes.py             #   ノート CRUD
│       │   └── speak_chat/
│       │       ├── chat_ws.py             #   チャット WebSocket
│       │       ├── chat.py                #   チャット REST
│       │       ├── speakers.py            #   スピーカー一覧
│       │       ├── synthesis.py           #   音声合成
│       │       └── turntaking_ws.py       #   ターンテイキング WS
│       └── service/                       # ビジネスロジック
│           ├── tts/
│           │   ├── streaming_tts.py       #   ストリーミング TTS
│           │   └── coeiroink_client.py    #   COEIROINK クライアント
│           ├── meta/meta_generator.py     #   メタ情報生成
│           └── turntaking/predictor.py    #   ターンテイキング予測
│
├── front/
│   ├── next.config.ts                     # Rewrites (API プロキシ)
│   └── src/
│       ├── auth.config.ts                 # NextAuth 設定 (Google OAuth)
│       ├── auth/index.ts                  # NextAuth 初期化
│       ├── proxy.ts                       # Middleware (認証ガード)
│       ├── app/                           # Next.js App Router
│       │   ├── layout.tsx                 #   ルートレイアウト
│       │   ├── page.tsx                   #   ホーム画面
│       │   ├── talk/page.tsx              #   メイン対話画面
│       │   ├── history/page.tsx           #   履歴一覧
│       │   ├── history/[id]/page.tsx      #   履歴詳細
│       │   ├── signin/page.tsx            #   サインイン
│       │   └── api/auth/[...nextauth]/    #   NextAuth API
│       ├── components/                    # UI コンポーネント
│       │   ├── VRMChat.tsx                #   3D アバター
│       │   ├── SessionStartDialog.tsx     #   セッション開始
│       │   ├── SpeechInputBar.tsx         #   音声入力バー
│       │   ├── TopBar.tsx                 #   トップバー
│       │   ├── BlackboardPanel.tsx        #   黒板パネル
│       │   ├── panels/                    #   パネル群
│       │   │   ├── PanelContainer.tsx     #     react-rnd ラッパー
│       │   │   ├── DialogLogPanel.tsx     #     対話ログ
│       │   │   ├── TextPanel.tsx          #     テキスト表示
│       │   │   ├── NotePanel.tsx          #     ノート編集
│       │   │   ├── IconBar.tsx            #     PC 用アイコンバー
│       │   │   └── MobileTabBar.tsx       #     モバイル用タブ
│       │   ├── markdown/                  #   Markdown 描画
│       │   ├── math/                      #   数式描画 (KaTeX)
│       │   └── note/                      #   ノート部品
│       ├── hooks/                         # カスタムフック
│       │   ├── useChat.ts                 #   統合チャットフック
│       │   ├── useSessionManager.ts       #   セッション管理
│       │   └── useAutoSave.ts             #   ノート自動保存
│       ├── lib/                           # ライブラリ
│       │   ├── api/authFetch.ts           #   認証付き fetch
│       │   ├── websocket/                 #   WebSocket 管理
│       │   │   ├── useChatWebSocket.ts
│       │   │   └── types.ts
│       │   ├── stt/                       #   音声認識 (Web Speech API)
│       │   ├── audio/                     #   音声再生キュー
│       │   ├── tts/                       #   TTS スピーカー選択
│       │   ├── turntaking/                #   ターンテイキング
│       │   └── math/                      #   数式ユーティリティ
│       ├── stores/                        # Zustand ストア
│       │   ├── dialogStore.ts             #   対話メッセージ
│       │   ├── sessionStore.ts            #   セッション状態
│       │   ├── noteStore.ts               #   ノート内容
│       │   ├── blackboardStore.ts         #   黒板数式
│       │   ├── panelStore.ts              #   パネル配置
│       │   └── understandingStore.ts      #   理解度
│       └── types/                         # 型定義
│           ├── auth.d.ts                  #   NextAuth 型拡張
│           ├── mathlive.d.ts              #   MathLive JSX 型
│           └── mdast.d.ts                 #   MDAST 数式ノード型
│
├── docker-compose.yml                     # Docker Compose 定義
└── .env                                   # 環境変数
```

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16, React 19, TypeScript |
| 状態管理 | Zustand |
| 3D描画 | Three.js + @pixiv/three-vrm |
| 数式編集 | MathLive (編集) / KaTeX (表示) |
| Markdown | remark → mdast → カスタム React コンポーネント |
| パネル | react-rnd (ドラッグ&リサイズ) |
| 認証 | NextAuth v5 + Google OAuth 2.0 |
| バックエンド | FastAPI (Python 3.13) |
| ORM | SQLAlchemy 2.0 Async + asyncpg |
| マイグレーション | Alembic |
| AI | LangChain + Google Gemini 2.5 Flash |
| TTS | COEIROINK (外部サービス) |
| STT | Web Speech API (ブラウザ内蔵) |
| DB | PostgreSQL 17 |
| コンテナ | Docker Compose |
| パッケージ | bun (front) / uv (back) |

---

## 環境変数

| 変数 | 用途 | 設定場所 |
|------|------|----------|
| `GOOGLE_API_KEY` | Gemini API キー | `.env` / `docker-compose` |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | `.env` / `docker-compose` |
| `AUTH_GOOGLE_ID` | NextAuth Google ID | `front/.env` |
| `AUTH_GOOGLE_SECRET` | NextAuth Google Secret | `front/.env` |
| `AUTH_SECRET` | NextAuth セッション暗号化キー | `front/.env` |
| `AUTH_REQUIRED` | 認証必須フラグ (true/false) | `.env` / `docker-compose` |
| `DATABASE_URL` | PostgreSQL 接続文字列 | `docker-compose` |
| `COEIROINK_API_URL` | COEIROINK エンドポイント | `.env` |

# MathGirl

VRMキャラクター「アリス」と会話できるAI学習サポートアプリケーション。

音声認識・音声合成・3Dアニメーションを組み合わせた、自然な対話体験を提供します。

## 主な機能

- **音声チャット**: マイクで話しかけると、アリスが音声で返答
- **VRMキャラクター**: 3Dモデルがリアルタイムで口パク・アニメーション
- **ストリーミング応答**: テキストと音声を並列配信し、高速なレスポンスを実現
- **目標設定**: 今日の目標を設定し、アリスが励ましてくれる
- **ポモドーロタイマー**: 集中タイマー機能

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         ユーザー                             │
│                    (音声入力 / 画面表示)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      nginx (port 3030)                       │
│                      リバースプロキシ                         │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────────┐
│   フロントエンド     │              │     バックエンド         │
│   (Next.js)         │◄────────────►│     (FastAPI)           │
│                     │  WebSocket   │                         │
│ - 音声認識 (STT)    │              │ - LLM (Gemini)          │
│ - VRM表示           │              │ - 音声合成 (COEIROINK)   │
│ - 音声再生          │              │ - チャット処理           │
└─────────────────────┘              └─────────────────────────┘
                                                │
                                                ▼
                                     ┌─────────────────────┐
                                     │   PostgreSQL        │
                                     │   (データベース)     │
                                     └─────────────────────┘
```

## 技術スタック

### フロントエンド
| 技術 | 用途 |
|------|------|
| Next.js 16 | Webフレームワーク |
| React 19 | UIフレームワーク |
| TypeScript | 言語 |
| Three.js | 3Dグラフィックス |
| @pixiv/three-vrm | VRMローダー |
| Tailwind CSS | スタイリング |
| Web Speech API | 音声認識 |

### バックエンド
| 技術 | 用途 |
|------|------|
| FastAPI | Webフレームワーク |
| Python 3.13 | 言語 |
| LangChain | LLMオーケストレーション |
| Google Gemini | LLM（会話生成） |
| COEIROINK | 音声合成 |
| PostgreSQL | データベース |

### インフラ
| 技術 | 用途 |
|------|------|
| Docker Compose | コンテナオーケストレーション |
| nginx | リバースプロキシ |

## セットアップ

### 前提条件

- Docker / Docker Compose
- [COEIROINK](https://coeiroink.com/)（ローカルで起動）
- Google Gemini APIキー

### 環境変数

`.env` ファイルを作成:

```env
FRONT_PORT=3030
BACK_PORT=8080
DB_PORT=5450
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mathgirl
GOOGLE_API_KEY=your_gemini_api_key
```

### 起動

**開発環境:**
```bash
# COEIROINKをローカルで起動しておく（port 50032）

# アプリケーション起動
docker compose up

# http://localhost:3030 にアクセス
```

**本番環境:**
```bash
docker compose -f docker-compose.prod.yml up --build
```

## ディレクトリ構造

```
mathgirl/
├── front/                      # フロントエンド
│   ├── src/
│   │   ├── app/                # ページ
│   │   │   ├── page.tsx        # トップ
│   │   │   ├── home/           # ホーム画面
│   │   │   ├── chat/           # チャット画面
│   │   │   └── timer/          # タイマー画面
│   │   ├── components/         # コンポーネント
│   │   │   ├── VRMChat.tsx     # VRM表示・アニメーション
│   │   │   └── ...
│   │   └── lib/                # ユーティリティ
│   │       ├── websocket/      # WebSocket通信
│   │       ├── tts/            # 音声合成
│   │       ├── stt/            # 音声認識
│   │       └── audio/          # 音声再生
│   └── Dockerfile
│
├── back/                       # バックエンド
│   ├── src/
│   │   ├── main.py             # エントリーポイント
│   │   ├── router/             # APIルーター
│   │   │   ├── chat.py         # REST API
│   │   │   ├── chat_ws.py      # WebSocket
│   │   │   └── synthesis.py    # 音声合成
│   │   ├── agent/              # AIエージェント
│   │   │   └── original_chat/  # アリスエージェント
│   │   └── service/            # ビジネスロジック
│   │       └── tts/            # TTS処理
│   └── Dockerfile
│
├── nginx/                      # リバースプロキシ設定
│   └── nginx.conf
│
├── docker-compose.yml          # 開発環境
├── docker-compose.prod.yml     # 本番環境
└── .env                        # 環境変数
```

## 通信フロー

```
[ユーザー発話]
     │
     ▼ Web Speech API
[音声認識・テキスト化]
     │
     ▼ WebSocket
[バックエンド受信]
     │
     ├─► AliceAgent (Gemini) ─► 文単位でストリーミング
     │                              │
     │                              ├─► TextChunk送信
     │                              │
     │                              └─► COEIROINK ─► AudioChunk送信
     │
     ▼ WebSocket
[フロントエンド受信]
     │
     ├─► テキスト表示（リアルタイム）
     │
     └─► 音声再生 + VRM口パク同期
```

## Docker

### コンテナ構成

| サービス | 説明 | 内部ポート | 外部公開 |
|---------|------|-----------|---------|
| `nginx` | リバースプロキシ | 80 | 3030 |
| `front` | Next.js フロントエンド | 3030 | - |
| `back` | FastAPI バックエンド | 8080 | - |
| `db` | PostgreSQL | 5432 | 5450 (開発時のみ) |

### 基本コマンド

```bash
# 起動
docker compose up

# バックグラウンドで起動
docker compose up -d

# ログを見ながら起動
docker compose up --build

# 停止
docker compose down

# 停止 + データベースリセット
docker compose down -v

# 特定サービスのみ再起動
docker compose restart front
docker compose restart back
```

### ログ確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービスのログ
docker compose logs -f front
docker compose logs -f back
docker compose logs -f nginx
```

### コンテナ内でコマンド実行

```bash
# フロントエンド
docker compose exec front bun run lint
docker compose exec front bun run build

# バックエンド
docker compose exec back uv run pytest
docker compose exec back uv run python -m src.main

# データベース
docker compose exec db psql -U postgres -d mathgirl
```

### イメージ再ビルド

```bash
# 全サービス
docker compose build

# 特定サービスのみ
docker compose build front
docker compose build back

# キャッシュなしで再ビルド
docker compose build --no-cache
```

### 開発環境 vs 本番環境

| 項目 | 開発 (`docker-compose.yml`) | 本番 (`docker-compose.prod.yml`) |
|-----|----------------------------|----------------------------------|
| フロントエンド | `bun run dev` (HMR有効) | `bun run build && start` |
| バックエンド | `fastapi dev` (自動リロード) | `fastapi run` |
| ソースマウント | あり（即時反映） | なし |
| DBポート | 外部公開 (5450) | 内部のみ |
| 再起動ポリシー | なし | `unless-stopped` |

## 開発

### 開発サーバーへのアクセス

| URL | 説明 |
|-----|------|
| http://localhost:3030 | アプリケーション |
| http://localhost:8080/docs | APIドキュメント (Swagger UI) |
| http://localhost:8080/redoc | APIドキュメント (ReDoc) |
| localhost:5450 | PostgreSQL (開発時) |

### ホットリロード

開発環境ではコード変更が自動反映されます：

- **フロントエンド**: ファイル保存時に即座にブラウザに反映
- **バックエンド**: ファイル保存時にサーバーが自動再起動

### パッケージ追加

```bash
# Python パッケージ追加
docker compose exec back uv add パッケージ名

# Python 開発用パッケージ追加
docker compose exec back uv add --dev パッケージ名

# Node.js パッケージ追加
docker compose exec front bun add パッケージ名

# Node.js 開発用パッケージ追加
docker compose exec front bun add -d パッケージ名
```

### コード編集のワークフロー

1. お好みのエディタでコードを編集
2. 保存すると自動でホットリロード
3. ブラウザで動作確認
4. 必要に応じてログを確認: `docker compose logs -f`

### デバッグ

**フロントエンド:**
- ブラウザの開発者ツール (F12) を使用
- `console.log()` でログ出力
- React Developer Tools 拡張機能

**バックエンド:**
- `print()` または `logging` でログ出力
- `docker compose logs -f back` でログ確認
- FastAPI の `/docs` でAPIテスト

### データベース操作

```bash
# PostgreSQL に接続
docker compose exec db psql -U postgres -d mathgirl

# SQLファイルを実行
docker compose exec -T db psql -U postgres -d mathgirl < script.sql

# データベースをダンプ
docker compose exec db pg_dump -U postgres mathgirl > backup.sql

# ダンプからリストア
docker compose exec -T db psql -U postgres -d mathgirl < backup.sql
```

### テスト

```bash
# バックエンドテスト
docker compose exec back uv run pytest

# フロントエンドリント
docker compose exec front bun run lint

# フロントエンドビルドチェック
docker compose exec front bun run build
```

### トラブルシューティング

**ポートが使用中:**
```bash
# 使用中のポートを確認
lsof -i :3030
lsof -i :8080

# プロセスを終了してから再起動
docker compose down && docker compose up
```

**コンテナが起動しない:**
```bash
# ログを確認
docker compose logs サービス名

# コンテナを再ビルド
docker compose build --no-cache サービス名
docker compose up
```

**データベース接続エラー:**
```bash
# DBコンテナの状態確認
docker compose ps db

# DBを再起動
docker compose restart db

# DBをリセット
docker compose down -v && docker compose up
```

**node_modules の問題:**
```bash
# node_modules を再インストール
docker compose down
docker volume rm mathgirl_node_modules 2>/dev/null || true
docker compose up --build front
```

### 主要なエンドポイント

| エンドポイント | 種別 | 説明 |
|---------------|------|------|
| `WS /ws/chat` | WebSocket | ストリーミングチャット |
| `POST /api/chat` | REST | 非ストリーミングチャット |
| `POST /api/synthesis` | REST | 音声合成 |
| `GET /api/speakers` | REST | スピーカー一覧 |
| `POST /api/aizuchi` | REST | 相槌生成 |
| `WS /ws/turntaking` | WebSocket | ターンテイキング |

## ライセンス

MIT

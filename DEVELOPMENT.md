# 開発環境

## 構成

| サービス | 技術スタック | デフォルトポート |
|---------|-------------|----------------|
| front | Next.js 16 + bun + TypeScript | 3030 |
| back | Python 3.13 + FastAPI + uv | 8080 |
| db | PostgreSQL 17 | 5450 |

## セットアップ

### 環境変数の設定

`.env`ファイルでポートやDB設定を変更できます:

```bash
# ポート設定
FRONT_PORT=3030
BACK_PORT=8080
DB_PORT=5450

# データベース設定
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mathgirl
```

### 起動

```bash
docker compose up
```

### バックグラウンド起動

```bash
docker compose up -d
```

### ログ確認

```bash
docker compose logs -f        # 全サービス
docker compose logs -f back   # バックエンドのみ
docker compose logs -f front  # フロントエンドのみ
```

### 停止

```bash
docker compose down
```

### 停止 + ボリューム削除（DBリセット）

```bash
docker compose down -v
```

## アクセスURL

- フロントエンド: http://localhost:${FRONT_PORT} (デフォルト: 3030)
- バックエンドAPI: http://localhost:${BACK_PORT} (デフォルト: 8080)
- API ドキュメント: http://localhost:${BACK_PORT}/docs

## データベース接続

```
Host: localhost
Port: ${DB_PORT} (デフォルト: 5450)
Database: ${POSTGRES_DB}
User: ${POSTGRES_USER}
Password: ${POSTGRES_PASSWORD}
```

接続文字列:
```
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/${POSTGRES_DB}
```

## 開発Tips

### パッケージ追加

**バックエンド (Python)**
```bash
docker compose exec back uv add パッケージ名
```

**フロントエンド (Node.js)**
```bash
docker compose exec front bun add パッケージ名
```

### コンテナ内でコマンド実行

```bash
docker compose exec back bash
docker compose exec front sh
docker compose exec db psql -U postgres -d mathgirl
```

### 再ビルド

依存関係を変更した後など:
```bash
docker compose up --build
```

強制的に再作成:
```bash
docker compose up --build --force-recreate
```

## ディレクトリ構成

```
mathgirl/
├── .env                 # 環境変数（ポート・DB設定）
├── docker-compose.yml
├── front/
│   ├── Dockerfile
│   ├── package.json
│   ├── bun.lock
│   └── src/
└── back/
    ├── Dockerfile
    ├── pyproject.toml
    ├── uv.lock
    └── src/
        ├── main.py
        └── app.py
```

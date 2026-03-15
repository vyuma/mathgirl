# Stage 1: node:20-slim で marp-cli をインストール
FROM node:20-slim AS node-tools
RUN npm install -g @marp-team/marp-cli

# Stage 2: メインイメージ
FROM python:3.13-slim

WORKDIR /app

# pyaudioのビルドに必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    gcc \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js 本体と node_modules を node-tools ステージからコピー
COPY --from=node-tools /usr/local/bin/node /usr/local/bin/node
COPY --from=node-tools /usr/local/lib/node_modules /usr/local/lib/node_modules

# marp のシェルラッパーを作成（シンボリックリンク解決問題を回避）
RUN printf '#!/bin/sh\nexec /usr/local/bin/node /usr/local/lib/node_modules/@marp-team/marp-cli/marp-cli.js "$@"\n' \
    > /usr/local/bin/marp && chmod +x /usr/local/bin/marp

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# ソースコードをコピー
COPY src ./src

EXPOSE 8080

CMD ["uv", "run", "fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "8080"]

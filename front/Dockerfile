FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./

# 開発用
FROM base AS development
RUN bun install
EXPOSE 3030
CMD ["bun", "run", "dev"]

# 本番ビルド
FROM base AS builder
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# 本番用
FROM base AS production
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3030
CMD ["bun", "run", "start"]

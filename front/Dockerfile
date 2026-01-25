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
FROM oven/bun:1 AS production
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
ENV NODE_ENV=production
EXPOSE 3030
CMD ["bun", "run", "start"]

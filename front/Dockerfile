FROM node:24-slim AS base
WORKDIR /app
RUN npm install -g bun
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
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN bun run build

# 本番用
FROM node:24-slim AS production
WORKDIR /app
RUN npm install -g bun
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
ENV NODE_ENV=production
EXPOSE 3030
CMD ["npm", "run", "start"]

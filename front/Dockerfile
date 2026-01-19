FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

EXPOSE 3030

CMD ["bun", "run", "dev"]

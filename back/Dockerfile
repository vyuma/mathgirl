FROM python:3.13-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

EXPOSE 8080

CMD ["uv", "run", "fastapi", "dev", "src/main.py", "--host", "0.0.0.0"]

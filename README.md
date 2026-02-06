# Redirector App (Bun + Express + Redis)

A minimalist redirect service with custom slugs, powered by Redis.

## Requirements
- Bun
- Redis

## Setup
```bash
bun install
```

Start Redis (example):
```bash
redis-server
```

Optional config:
```bash
cp .env.example .env
```

## Run
```bash
bun run dev
```

Open in your browser:
```text
http://localhost:3000
```

## API
- `POST /api/shorten` body: `{ "url": "https://example.com", "slug": "custom" }`
- `GET /:slug` redirects to the target

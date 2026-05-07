# Deployment Guide

## Local Development

```bash
bun install
bunx tsx scripts/migrate.ts   # run all migrations
bunx tsx scripts/seed-demo.ts # seed 14 demo products
bun dev                        # starts on localhost:3000
```

## Self-Hosted LLM (Ollama + Qwen3 14B)

Polaris runs entirely on open-weight models — no cloud AI vendor required.

### 1. Install Ollama

```bash
brew install ollama
brew services start ollama
ollama pull qwen3:14b
```

### 2. Expose via Cloudflare Tunnel (free public HTTPS URL)

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:11434
# Outputs: https://your-tunnel.trycloudflare.com
```

For a permanent URL (recommended for production):

```bash
cloudflared tunnel login
cloudflared tunnel create polaris
cloudflared tunnel route dns polaris your-subdomain.yourdomain.com
cloudflared tunnel run polaris
```

### 3. Set environment variables

```env
LLM_BASE_URL=https://your-tunnel.trycloudflare.com/v1
LLM_MODEL=qwen3:14b
```

## Vercel Deployment

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars from `.env.example`
4. Set `LLM_BASE_URL` to your Cloudflare Tunnel URL
5. Deploy

## GitHub Actions Cron

The agent runs daily at 6am AEST (20:00 UTC) automatically.

Required GitHub Actions secrets:
- `NEXT_PUBLIC_APP_URL` — your Vercel deployment URL
- `AGENT_SECRET` — Bearer token for `/api/agent/run`

## Trigger a Manual Run

```bash
curl -X POST https://your-app.vercel.app/api/agent/run \
  -H "Authorization: Bearer $AGENT_SECRET"
```

## Architecture Decision: Why Open-Weight?

- **Privacy** — inventory data never leaves your infrastructure
- **Cost** — zero per-token charges, runs on your own hardware
- **Reliability** — no rate limits, no vendor downtime risk
- **Transparency** — full control over the model weights and behaviour

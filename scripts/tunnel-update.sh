#!/usr/bin/env bash
# tunnel-update.sh — Start a Cloudflare quick tunnel for Ollama and update Vercel LLM_BASE_URL
# Run on Mac startup or whenever the tunnel needs to be refreshed.
# Usage: bash scripts/tunnel-update.sh [--no-update-vercel]

set -euo pipefail

OLLAMA_PORT="${OLLAMA_PORT:-11434}"
UPDATE_VERCEL=true
if [[ "${1:-}" == "--no-update-vercel" ]]; then
  UPDATE_VERCEL=false
fi

# Kill any existing quick tunnels for Ollama
pkill -f "cloudflared tunnel --url http://localhost:${OLLAMA_PORT}" 2>/dev/null || true
sleep 1

TMPLOG=$(mktemp)
trap 'rm -f "$TMPLOG"' EXIT

echo "[tunnel-update] Starting cloudflared quick tunnel on port $OLLAMA_PORT..."
cloudflared tunnel --url "http://localhost:${OLLAMA_PORT}" >"$TMPLOG" 2>&1 &
TUNNEL_PID=$!

# Wait up to 30s for the trycloudflare.com URL
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TMPLOG" | head -1 || true)
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "[tunnel-update] ERROR: Could not get tunnel URL after 30s"
  cat "$TMPLOG"
  exit 1
fi

LLM_BASE_URL="${TUNNEL_URL}/v1"
echo "[tunnel-update] Tunnel live: $LLM_BASE_URL (PID: $TUNNEL_PID)"

# Save locally for reference
mkdir -p ~/.cloudflared
echo "$LLM_BASE_URL" > ~/.cloudflared/current-ollama-url

if [[ "$UPDATE_VERCEL" == "true" ]]; then
  if ! command -v vercel &>/dev/null; then
    echo "[tunnel-update] WARNING: vercel CLI not found — skipping Vercel env update"
    echo "[tunnel-update] Set LLM_BASE_URL=$LLM_BASE_URL in Vercel manually"
  else
    echo "[tunnel-update] Updating Vercel LLM_BASE_URL..."
    # Remove old value then add new one
    vercel env rm LLM_BASE_URL production --yes 2>/dev/null || true
    printf '%s' "$LLM_BASE_URL" | vercel env add LLM_BASE_URL production
    echo "[tunnel-update] Vercel updated. Triggering redeploy..."
    vercel deploy --prod --force --no-wait 2>/dev/null || echo "[tunnel-update] Redeploy skipped (no changes or already deploying)"
  fi
fi

echo "[tunnel-update] Done. Tunnel PID=$TUNNEL_PID running in background."
echo "[tunnel-update] LLM_BASE_URL=$LLM_BASE_URL"

# Keep tunnel alive — wait for it
wait "$TUNNEL_PID"

#!/usr/bin/env bash
# tunnel-update.sh — Start a Cloudflare quick tunnel for Ollama and keep Vercel in sync.
# Run under launchd (KeepAlive=true) — when tunnel dies, launchd restarts this script,
# which starts a fresh tunnel and pushes the new URL to Vercel automatically.
#
# Usage: bash scripts/tunnel-update.sh [--no-update-vercel]

set -euo pipefail

OLLAMA_PORT="${OLLAMA_PORT:-11434}"
PROJECT_DIR="${POLARIS_DIR:-/Users/tasmanstar/Desktop/demo/polaris}"
UPDATE_VERCEL=true
if [[ "${1:-}" == "--no-update-vercel" ]]; then
  UPDATE_VERCEL=false
fi

# Wait for Ollama to be ready (important after Mac wake)
echo "[tunnel] Waiting for Ollama on port $OLLAMA_PORT..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
    echo "[tunnel] Ollama ready"
    break
  fi
  sleep 2
done

# Kill any existing quick tunnels for this port
pkill -f "cloudflared tunnel --url http://localhost:${OLLAMA_PORT}" 2>/dev/null || true
sleep 1

TMPLOG=$(mktemp)
trap 'rm -f "$TMPLOG"; kill "$TUNNEL_PID" 2>/dev/null || true' EXIT

echo "[tunnel] Starting cloudflared quick tunnel on port $OLLAMA_PORT..."
/opt/homebrew/bin/cloudflared tunnel --url "http://localhost:${OLLAMA_PORT}" >"$TMPLOG" 2>&1 &
TUNNEL_PID=$!

# Wait up to 30s for the trycloudflare.com URL to appear in logs
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TMPLOG" 2>/dev/null | head -1 || true)
  if [[ -n "$TUNNEL_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "[tunnel] ERROR: Could not get tunnel URL after 30s. Logs:"
  cat "$TMPLOG"
  exit 1
fi

LLM_BASE_URL="${TUNNEL_URL}/v1"
echo "[tunnel] Live: $LLM_BASE_URL (PID: $TUNNEL_PID)"

# Save locally for reference / debugging
mkdir -p ~/.cloudflared
echo "$LLM_BASE_URL" > ~/.cloudflared/current-ollama-url
echo "[tunnel] URL saved to ~/.cloudflared/current-ollama-url"

# .env.local update skipped (Desktop is TCC-protected from launchd agents)
# Update it manually after running: cat ~/.cloudflared/current-ollama-url

if [[ "$UPDATE_VERCEL" == "true" ]]; then
  VERCEL_TOKEN_FILE="$HOME/Library/Scripts/polaris/.vercel-token"
  VERCEL_PROJECT_ID="prj_OT4EgSTVAWQSaIiB2TLsLY1dLOzh"
  VERCEL_ENV_ID="GuVwDNrsnUXoXABN"   # production LLM_BASE_URL env var ID

  if [[ -f "$VERCEL_TOKEN_FILE" ]]; then
    VERCEL_TOKEN=$(cat "$VERCEL_TOKEN_FILE")
    echo "[tunnel] Updating Vercel LLM_BASE_URL via REST API..."
    HTTP_CODE=$(curl -s -o /tmp/vercel-resp.json -w "%{http_code}" \
      -X PATCH "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_ENV_ID}" \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"value\": \"${LLM_BASE_URL}\"}")
    if [[ "$HTTP_CODE" == "200" ]]; then
      echo "[tunnel] Vercel updated ✓ (takes effect on next function cold-start)"
    else
      echo "[tunnel] Vercel update failed HTTP $HTTP_CODE: $(cat /tmp/vercel-resp.json)"
    fi
  else
    echo "[tunnel] WARNING: No Vercel token at $VERCEL_TOKEN_FILE — skipping Vercel update"
  fi
fi

echo "[tunnel] Ready. Holding tunnel open... (launchd will restart on exit)"

# Block until tunnel dies — launchd restarts this script → fresh URL → Vercel updated
wait "$TUNNEL_PID"
echo "[tunnel] Tunnel exited. launchd will restart."

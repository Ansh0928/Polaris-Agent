#!/usr/bin/env bash
# setup-named-tunnel.sh — One-time setup for permanent Cloudflare named tunnel
# Replaces ephemeral quick tunnels with a fixed UUID URL that never changes.
# Run once, then launchd keeps it alive forever.
#
# Usage: bash scripts/setup-named-tunnel.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_NAME="polaris-qwen"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"

echo "=== Polaris Named Tunnel Setup ==="
echo "This replaces ephemeral trycloudflare.com URLs with a permanent tunnel."
echo ""

# ── 1. Login ──────────────────────────────────────────────────────────────────
echo "[1/6] Cloudflare login (opens browser)..."
cloudflared tunnel login
echo ""

# ── 2. Create tunnel (idempotent) ─────────────────────────────────────────────
echo "[2/6] Creating named tunnel '$TUNNEL_NAME'..."
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  echo "  Tunnel '$TUNNEL_NAME' already exists — skipping creation"
else
  cloudflared tunnel create "$TUNNEL_NAME"
fi

# Get the tunnel UUID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
if [[ -z "$TUNNEL_ID" ]]; then
  echo "ERROR: Could not get tunnel ID for '$TUNNEL_NAME'"
  exit 1
fi

TUNNEL_URL="https://${TUNNEL_ID}.cfargotunnel.com/v1"
echo "  Tunnel ID  : $TUNNEL_ID"
echo "  Tunnel URL : $TUNNEL_URL"
echo ""

# ── 3. Write cloudflared config ───────────────────────────────────────────────
echo "[3/6] Writing ~/.cloudflared/config.yml..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${HOME}/.cloudflared/${TUNNEL_ID}.json

ingress:
  - service: http://localhost:${OLLAMA_PORT}
EOF
echo "  Done"
echo ""

# ── 4. Install launchd services ───────────────────────────────────────────────
echo "[4/6] Installing launchd services..."

# cloudflared
cp "$PROJECT_DIR/scripts/launchd/com.polaris.cloudflared.plist" ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.polaris.cloudflared.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.polaris.cloudflared.plist
echo "  cloudflared service loaded"

# Ollama
cp "$PROJECT_DIR/scripts/launchd/com.polaris.ollama.plist" ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.polaris.ollama.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.polaris.ollama.plist
echo "  Ollama service loaded"
echo ""

# ── 5. Set daily Mac wake ─────────────────────────────────────────────────────
echo "[5/6] Scheduling daily Mac wake at 5:55am (before 6am AEST cron)..."
sudo pmset repeat wake MTWRFSU 05:55:00
echo "  pmset configured"
echo ""

# ── 6. Update Vercel env vars ─────────────────────────────────────────────────
echo "[6/6] Updating Vercel LLM_BASE_URL..."
if command -v vercel &>/dev/null; then
  for env in production preview development; do
    vercel env rm LLM_BASE_URL "$env" --yes 2>/dev/null || true
    printf '%s' "$TUNNEL_URL" | vercel env add LLM_BASE_URL "$env"
    echo "  Updated: $env"
  done
  echo "  Triggering redeploy..."
  vercel deploy --prod --force --no-wait 2>/dev/null || echo "  (redeploy skipped — no changes detected)"
else
  echo "  vercel CLI not found. Set manually in Vercel dashboard:"
  echo "  LLM_BASE_URL = $TUNNEL_URL"
fi

# Save URL locally for reference
echo "$TUNNEL_URL" > ~/.cloudflared/current-ollama-url
echo ""

# Update project .env.local
if [[ -f "$PROJECT_DIR/.env.local" ]]; then
  if grep -q "LLM_BASE_URL" "$PROJECT_DIR/.env.local"; then
    sed -i '' "s|LLM_BASE_URL=.*|LLM_BASE_URL=${TUNNEL_URL}|" "$PROJECT_DIR/.env.local"
  else
    echo "LLM_BASE_URL=${TUNNEL_URL}" >> "$PROJECT_DIR/.env.local"
  fi
  echo "  .env.local updated"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "  Tunnel URL : $TUNNEL_URL"
echo "  Logs       : ~/Library/Logs/polaris-cloudflared.log"
echo "  Ollama log : ~/Library/Logs/polaris-ollama.log"
echo ""
echo "Verify tunnel is working:"
echo "  curl ${TUNNEL_URL%/v1}/api/tags"
echo ""
echo "Mac will wake daily at 5:55am → tunnel live → 6am AEST GitHub Actions cron fires."

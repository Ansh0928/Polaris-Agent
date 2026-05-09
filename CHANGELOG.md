# Changelog

## [0.2.0] - 2026-05-09

### Added
- Purchase Orders workflow: agent now calls `create_purchase_order` for each low-stock item after gathering data, creating draft POs in the database
- Orders page (`/orders`) — lists all purchase orders with status chips (draft/approved/received/cancelled), cost calculation, agent reason, and one-click Approve button
- Approve endpoint (`GET /api/orders/approve?token=<UUID>`) — token-based PO approval with styled HTML confirmation page
- Sidebar Orders nav item with live amber badge showing count of pending draft POs (polled every 60s)
- Mobile hamburger menu shows amber dot when draft POs are pending
- Demo tour v4: new Orders step explaining draft PO approval flow; corrected Decisions step description
- `scripts/setup-ec2-ollama.sh` — helper script for running the Ollama LLM on AWS EC2 with IMDSv2-compliant metadata fetches

### Fixed
- Agent dedup guard now exempts `create_purchase_order` — previously blocked after the first PO, preventing multi-product orders
- Agent workflow nudge now fires after `write_memory` to ensure POs are created before final response
- Fallback supplier (`pfdfoodservice.com.au`) used when live price API returns no results
- Approve token stripped from `GET /api/orders` JSON response (was exposed to unauthenticated callers)
- Concurrent approve requests now correctly detect zero-row UPDATE and return already-processed page
- `MULTI_CALL_ALLOWED` Set hoisted to module scope (was recreated on every tool loop iteration)

## [0.1.4] - 2026-05-08

### Added
- Decisions dashboard (`/decisions`) — full audit trail of every `log_decision` call, showing action, reasoning, timestamp, and linked run status badge
- Agent Memory page upgraded: search/filter by key or value, inline edit, delete with confirmation, expandable write history per entry
- `agent_memory_history` table (migration 010) — tracks every `write_memory` call with timestamp and optional `run_id` link
- `writeMemory` dual-writes to `agent_memory_history` so the agent's learning is fully auditable
- Manual memory edit/delete via server actions (`updateMemoryEntry`, `deleteMemoryEntry`) with `revalidatePath` cache invalidation
- Decisions nav item added to sidebar between Logs and Monitor

## [0.1.3] - 2026-05-08

### Changed
- Mobile responsive UI: sidebar replaced with hamburger drawer pattern on small screens
- Overview stat grid stacks 2-up on mobile (was always 4-column)
- Overview panels stack vertically on mobile (was always side-by-side)
- Inventory table hides Category and Location columns on small screens; date display shortened to `(Nd)` format on mobile
- Logs table hides Tool Calls and Items Flagged columns on small screens; reduced cell padding on mobile

## [0.1.2] - 2026-05-08

### Changed
- Tunnel infrastructure now runs under launchd with `KeepAlive=true` — when the Cloudflare quick tunnel dies, launchd automatically restarts the script, which starts a fresh tunnel and pushes the new URL to Vercel via REST API (no redeploy required)
- Replaced Vercel CLI dependency with a direct `PATCH /v9/projects/{id}/env/{envId}` REST call using a token stored at `~/Library/Scripts/polaris/.vercel-token`
- `tunnel-update.sh` now blocks on the tunnel process (`wait $TUNNEL_PID`) so launchd receives the exit signal correctly

### Added
- `scripts/launchd/com.polaris.ollama.plist` — keeps `ollama serve` alive at login
- `scripts/launchd/com.polaris.tunnel.plist` — runs `tunnel-update.sh` at login, restarts on exit (ThrottleInterval=15s)
- `scripts/launchd/com.polaris.cloudflared.plist` — reference plist for named-tunnel mode
- Ollama readiness wait loop (30 × 2s) in `tunnel-update.sh` — handles Mac wake latency before the tunnel starts

## [0.1.1] - 2026-05-08

### Fixed
- `create_purchase_order` tool now validates `product_id` is a real UUID before the Postgres INSERT. Previously, the agent could hallucinate a non-UUID value (e.g. `"12345"`) causing `invalid input syntax for type uuid` errors. The tool now returns a soft error directing the agent to call `check_inventory` first and use the actual `product.id` field.
- Updated `product_id` tool description to explicitly state the value must come from `check_inventory` output — prevents hallucination at the prompt level.

## [0.1.0] - 2026-05-07

### Added
- Initial release: autonomous inventory agent with Hermes tool loop
- `check_inventory`, `flag_alerts`, `fetch_supplier_prices`, `write_memory`, `read_memory`, `check_website_prices`, `monitor_competitor_prices`, `create_purchase_order`, `log_decision` tools
- Draft purchase orders with 1-tap email approval link
- Decision audit trail via `decision_log` table
- Self-healing loop with jittered retry, checkpoint every 3 iterations, reflection
- Groq cloud fallback when Ollama is unavailable
- GitHub Actions cron — daily 6am AEST

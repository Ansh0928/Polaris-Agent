---
name: polaris-inventory
description: "Polaris: autonomous fresh food inventory agent. Check stock, flag expiring items, trigger AI analysis, view run history."
version: 1.0.0
metadata:
  hermes:
    tags: [inventory, food, warehouse, reorder, expiry, alerts, polaris]
---

# Polaris Inventory Agent

Polaris is an autonomous fresh food warehouse inventory manager. This skill lets you interact with a running Polaris instance — check stock levels, flag expiring items, trigger the AI analysis loop, and view historical runs.

## Setup

Set these environment variables (add to `~/.hermes/.env`):

```bash
POLARIS_URL=https://your-polaris-app.vercel.app
POLARIS_SECRET=your-agent-secret
```

Or set per-session:
```bash
export POLARIS_URL=https://your-polaris-app.vercel.app
export POLARIS_SECRET=your-agent-secret
```

## Commands

### Check current inventory
```bash
curl -s "$POLARIS_URL/api/inventory" | jq '.[] | {product_name, quantity, unit, expiry_date, location, reorder_threshold}'
```

To filter expiring items (within 7 days):
```bash
TODAY=$(date +%Y-%m-%d)
curl -s "$POLARIS_URL/api/inventory" | jq --arg today "$TODAY" \
  '[.[] | select((.expiry_date | fromdateiso8601) - ($today | fromdateiso8601) / 86400 <= 7)]'
```

### Check low stock
```bash
curl -s "$POLARIS_URL/api/inventory" | jq '[.[] | select(.quantity <= .reorder_threshold)] | {product_name, quantity, reorder_threshold, unit}'
```

### Trigger the AI analysis + email
```bash
curl -s -X POST "$POLARIS_URL/api/agent/run" \
  -H "Authorization: Bearer $POLARIS_SECRET" \
  -H "Content-Type: application/json" | jq .
```

The agent will:
1. Snapshot current inventory
2. Flag items expiring within 7 days or below reorder threshold
3. Fetch live supplier prices from Australian foodservice suppliers
4. Generate Hermes 3 reorder recommendations (structured JSON)
5. Send an HTML email report to the configured admin address
6. Persist the run to the database

### View recent runs
```bash
curl -s "$POLARIS_URL/api/runs" | jq '.[] | {id, ran_at, status, flagged_count}'
```

### Add inventory item
```bash
# First upsert the product
PRODUCT=$(curl -s -X POST "$POLARIS_URL/api/inventory/product" \
  -H "Content-Type: application/json" \
  -d '{"name":"Atlantic Salmon","category":"fish","unit":"kg","reorder_threshold":15}')
PRODUCT_ID=$(echo $PRODUCT | jq -r '.id')

# Then add inventory
curl -s -X POST "$POLARIS_URL/api/inventory" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"quantity\":20,\"expiry_date\":\"2026-05-12\",\"location\":\"chiller-1\"}" | jq .
```

### Update an inventory item
```bash
# Get item id from inventory list first
ITEM_ID="<uuid-from-inventory>"
curl -s -X PATCH "$POLARIS_URL/api/inventory/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 25}' | jq .
```

### Delete an inventory item
```bash
ITEM_ID="<uuid-from-inventory>"
curl -s -X DELETE "$POLARIS_URL/api/inventory/$ITEM_ID"
```

## Inventory Data Shape

```json
{
  "id": "uuid",
  "product_name": "Atlantic Salmon",
  "category": "fish",
  "unit": "kg",
  "quantity": 8,
  "reorder_threshold": 15,
  "expiry_date": "2026-05-09",
  "location": "chiller-1"
}
```

Categories: `fish`, `meat`, `dairy`, `produce`, `other`
Locations: `zone-a`, `zone-b`, `zone-c`, `freezer-1`, `freezer-2`, `chiller-1`, `chiller-2`

## Agent Run Response

```json
{
  "run_id": "uuid",
  "flagged_count": 5,
  "status": "success"
}
```

## Alert Thresholds

- **Expiry alert**: `expiry_date` within 7 days
- **Low stock alert**: `quantity <= reorder_threshold`
- **Both**: item is both expiring and low stock

## Autonomous Daily Schedule

Polaris runs automatically at 6am AEST every day via GitHub Actions. To set up the cron:

1. Push the repo to GitHub
2. Add repository secrets: `APP_URL` and `AGENT_SECRET`
3. The workflow at `.github/workflows/agent-daily.yml` handles the rest

## Dashboard

View inventory, run history, and email previews at:
```
$POLARIS_URL/          # Dashboard + stats
$POLARIS_URL/inventory # Full inventory table
$POLARIS_URL/runs      # Agent run history
```

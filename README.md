# Polaris — Autonomous Inventory Management Agent

**Polaris** is an autonomous AI agent for fresh food warehouse inventory management. It monitors stock levels, flags expiry and reorder risks, fetches live retail prices from the web, calculates profit margins, and emails daily intelligence — all without human intervention.

Built for the **Hourglass AI Challenge (May 2026)**.

---

## What Makes Polaris Different

Most inventory tools alert you when stock is low. Polaris goes further — it autonomously monitors **margin health** by comparing your warehouse cost prices against live retail prices on your own website, detects erosion trends over time via persistent memory, and surfaces the insight in a daily email before it becomes a problem.

**The intelligence loop:**
1. Agent checks warehouse stock and cost prices
2. Agent fetches live retail prices from [tasmanstarseafoodmarket.com.au](https://www.tasmanstarseafoodmarket.com.au)
3. Agent matches products, calculates margins, flags erosion
4. Agent writes memory observations: *"Salmon margin dropped 4.5% this week — supplier price spike"*
5. Next run, it compares against that memory. Trends emerge autonomously.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     GitHub Actions Cron                  │
│              (daily 6am AEST / 20:00 UTC)                │
└─────────────────────────┬────────────────────────────────┘
                          │ POST /api/agent/run
                          ▼
┌──────────────────────────────────────────────────────────┐
│                      Agent Loop (LLM)                    │
│                                                          │
│  System Prompt = role + injected memory + loaded skills  │
│                                                          │
│  ┌──────────┐    tool_calls?    ┌─────────────────────┐  │
│  │ LLM Call │ ────────────────► │   Tool Executor     │  │
│  │          │ ◄──────────────── │  check_inventory    │  │
│  └──────────┘   tool results   │  flag_alerts        │  │
│       │                        │  check_website_prices│  │
│       │ finish_reason=stop     │  fetch_supplier_prices│  │
│       ▼                        │  write_memory       │  │
│  Final Response                │  read_memory        │  │
└──────────────┬─────────────────└─────────────────────┘──┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              LLM Reasoning (JSON synthesis)               │
│   Structured report: alerts + margins + recommendations   │
└──────────────┬───────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌────────────┐  ┌──────────────────┐
│   Resend   │  │  Neon PostgreSQL  │
│   Email    │  │  agent_runs      │
│  (daily)   │  │  reorder_log     │
└────────────┘  │  agent_memory    │
               └──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Neon serverless PostgreSQL |
| AI Model | GPT-OSS 20B via OpenRouter |
| Retail Price Scraping | Direct website API (tasmanstarseafoodmarket.com.au) |
| Email | Resend |
| Deployment | Vercel |
| Scheduler | GitHub Actions cron |
| Package Manager | Bun |
| Styling | Tailwind CSS v4 |

---

## Available Tools

The LLM decides which tools to call and in what order — no hardcoded sequence.

| Tool | Description |
|---|---|
| `check_inventory` | Full warehouse snapshot: quantities, expiry dates, cost prices, locations |
| `flag_alerts` | Items expiring ≤7 days or below reorder threshold |
| `check_website_prices` | Live retail prices from tasmanstarseafoodmarket.com.au (sashimi category) |
| `fetch_supplier_prices` | Live AUD prices from PFD, Bidvest, Harris Farm |
| `write_memory` | Persist observations across runs (margin trends, supplier notes) |
| `read_memory` | Read all memory entries from previous runs |

---

## Margin Intelligence

The standout feature. Each run:

1. `check_inventory` returns warehouse products with `cost_price_aud`
2. `check_website_prices` returns live retail prices from the public website
3. LLM matches products by name, calculates: `margin = (retail - cost) / retail × 100`
4. Margin status thresholds: **Healthy ≥ 45%** · **Warning 30–44%** · **Critical < 30%**
5. Agent writes memory: *"Salmon margin: 57.5% (was 62% last run — erosion trend)"*

The daily email includes a **Margin Intelligence** table:

| Product | Retail | Cost | Margin | Status |
|---|---|---|---|---|
| Salmon sashimi 200g | $20.00 | $8.50 | 57.5% | ✓ Healthy |
| Kingfish sashimi 200g | $24.00 | $14.00 | 41.7% | ⚠ Warning |

---

## Project Structure

```
polaris/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dashboard: stats + recent runs
│   │   ├── inventory/page.tsx          # Full inventory table
│   │   ├── runs/[id]/page.tsx          # Agent run detail view
│   │   └── api/
│   │       ├── agent/run/route.ts      # POST — triggers agent loop
│   │       ├── inventory/route.ts      # GET — inventory snapshot
│   │       ├── runs/route.ts           # GET — recent agent runs
│   │       └── runs/[id]/route.ts      # GET — single run detail
│   ├── lib/
│   │   ├── db.ts                       # Neon SQL client
│   │   └── agent/
│   │       ├── engine/
│   │       │   ├── loop.ts             # Core agentic loop
│   │       │   ├── tools.ts            # Tool definitions + executors
│   │       │   ├── memory.ts           # Cross-run DB memory
│   │       │   └── skills.ts           # SKILL.md loader → system prompt
│   │       ├── snapshot.ts             # Inventory DB query (includes cost_price_aud)
│   │       ├── flag.ts                 # Expiry + reorder threshold logic
│   │       ├── supplier.ts             # Live supplier price fetcher
│   │       ├── website.ts              # Live retail price fetcher (Tasman Star API)
│   │       ├── reason.ts               # LLM JSON report synthesis + margin analysis
│   │       └── email.ts                # Resend email builder (incl. margin section)
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── migrations/
│   ├── 001_initial.sql                # Core tables
│   ├── 002_agent_memory.sql           # Agent memory table
│   ├── 003_location_columns.sql       # Warehouse location columns
│   └── 004_cost_price.sql             # cost_price_aud on products
├── scripts/
│   ├── migrate.ts                     # Run all migrations
│   ├── seed-demo.ts                   # 14 products + inventory items
│   └── seed-cost-prices.ts            # Wholesale cost prices for margin analysis
├── skills/
│   └── polaris-inventory/
│       └── SKILL.md                   # Agent skill injected into system prompt
└── .github/
    └── workflows/
        └── agent-daily.yml            # Daily 6am AEST cron trigger
```

---

## Database Schema

### `products`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | Product identifier |
| name | TEXT | Product name |
| category | TEXT | fish / meat / dairy / produce |
| unit | TEXT | kg / L / each |
| reorder_threshold | INT | Minimum stock level |
| cost_price_aud | NUMERIC | Wholesale cost per unit |

### `inventory`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | Inventory record |
| product_id | UUID FK | → products |
| quantity | NUMERIC | Current stock |
| expiry_date | DATE | Best before date |
| location | TEXT | Warehouse zone |
| updated_at | TIMESTAMPTZ | Last updated |

### `agent_runs`
| Column | Type | Description |
|---|---|---|
| id | UUID PK | Run identifier |
| created_at | TIMESTAMPTZ | When it ran |
| status | TEXT | success / error |
| report_json | JSONB | Full report (incl. margin_alerts) |
| email_html | TEXT | Rendered email HTML |
| error_message | TEXT | Error details (if failed) |

### `agent_memory`
| Column | Type | Description |
|---|---|---|
| key | TEXT PK | Memory identifier |
| value | TEXT | Persisted observation (margin trends, supplier notes) |
| updated_at | TIMESTAMPTZ | Last updated |

---

## How the Agent Loop Works

```
1. Build system prompt:
   - Role + margin intelligence instructions
   - Inject agent_memory (persisted from previous runs — margin trends live here)
   - Inject skills from skills/*/SKILL.md

2. Loop (max 12 iterations):
   a. Call LLM with current messages + tool definitions
   b. If finish_reason=stop → done
   c. Execute each tool call sequentially
   d. Append tool results to messages → repeat

3. Post-loop:
   - Extract FlaggedItem[], SupplierResult[], WebsitePrice[] from tool call log
   - Pass to LLM reasoning → structured JSON report with margin_alerts[]
   - Send email if items flagged OR website prices fetched
   - Persist run to agent_runs + reorder_log tables
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://...               # Neon connection string
OPENROUTER_API_KEY=sk-or-v1-...            # OpenRouter API key
RESEND_API_KEY=re_...                      # Email delivery
RESEND_FROM=Polaris <onboarding@resend.dev>
ADMIN_EMAIL=your@email.com                 # Receives daily report
AGENT_SECRET=your-secret-here             # Bearer token for /api/agent/run
NEXT_PUBLIC_AGENT_SECRET=your-secret-here  # Client-side trigger button
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Ansh0928/Polaris-Agent.git
cd Polaris-Agent
bun install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in all values
```

### 3. Set up the database

```bash
bunx tsx scripts/migrate.ts       # Run all migrations
bunx tsx scripts/seed-demo.ts     # Seed 14 demo products
bunx tsx scripts/seed-cost-prices.ts  # Seed wholesale cost prices
```

### 4. Run locally

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Trigger the agent manually

```bash
curl -X POST http://localhost:3000/api/agent/run \
  -H "Authorization: Bearer your-agent-secret"
```

Or use the **Run Agent** button on the dashboard.

---

## Deployment (Vercel)

1. Connect repo to Vercel
2. Add all environment variables in Project Settings → Environment Variables
3. Deploy — `maxDuration = 60` is set on the agent route

### GitHub Actions Cron

Add two secrets to your GitHub repo (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `APP_URL` | Your Vercel deployment URL |
| `AGENT_SECRET` | Same value as `AGENT_SECRET` env var |

The workflow at `.github/workflows/agent-daily.yml` runs daily at **6:00 AM AEST** (20:00 UTC).

---

## Dashboard Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | KPI stats, flagged alerts, recent runs |
| Inventory | `/inventory` | Full product stock table with cost prices |
| Run Detail | `/runs/[id]` | Full report, tool call trace, email preview |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/agent/run` | Bearer | Trigger full agent loop |
| GET | `/api/inventory` | — | Current inventory snapshot |
| GET | `/api/runs` | — | Recent 20 agent runs |
| GET | `/api/runs/[id]` | — | Single run detail |

---

## License

MIT

@AGENTS.md

# Polaris — Autonomous Inventory Management Agent

Built for the Hourglass AI Challenge (May 2026). Daily cron agent that monitors fresh food warehouse stock, flags expiry/reorder risks, fetches live supplier prices, and emails recommendations — no human needed.

## Package Manager

Always use **bun**. Never npm, yarn, or pnpm.

```bash
bun install          # install deps
bun dev              # dev server (localhost:3000)
bun run build        # production build
bun run test         # vitest run (single pass)
bun run test:watch   # vitest watch
bunx tsx scripts/migrate.ts    # run all migrations
bunx tsx scripts/seed-demo.ts  # seed 14 demo products
```

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.4 (App Router) — see AGENTS.md, APIs differ from training data |
| Language | TypeScript |
| Database | Neon serverless PostgreSQL via `@neondatabase/serverless` |
| AI Model | GPT-OSS 20B — `openai/gpt-oss-20b:free` via OpenRouter |
| HTTP client | `openai` SDK pointed at `https://openrouter.ai/api/v1` |
| Email | Resend |
| Live pricing | TinyFish web scraping API |
| Styling | Tailwind CSS v4 |
| Testing | Vitest |
| Deployment | Vercel (maxDuration = 60 on agent route) |
| Scheduler | GitHub Actions cron — daily 6am AEST (20:00 UTC) |

## Architecture

```
GitHub Actions cron (daily 6am AEST)
  └─► POST /api/agent/run (Bearer auth)
        └─► runAgentLoop()              src/lib/agent/engine/loop.ts
              ├── loadMemory()          reads agent_memory table → system prompt
              ├── loadSkills()          reads skills/*/SKILL.md → system prompt
              └── Hermes 3 tool loop (max 12 iterations)
                    ├── check_inventory    → snapshotInventory()
                    ├── flag_alerts        → flagItems()
                    ├── fetch_supplier_prices → fetchSupplierPrices() (TinyFish)
                    ├── write_memory       → upsert agent_memory
                    └── read_memory        → select agent_memory
        └─► reasonWithHermes()         structured JSON report synthesis
        └─► sendDailyEmail()           Resend (only if items flagged)
        └─► INSERT agent_runs + reorder_log (Neon)
```

## Key Files

```
src/lib/agent/engine/
  loop.ts       Core agentic loop — Hermes pattern, max 12 iterations, strips <think> blocks
  tools.ts      TOOL_DEFINITIONS (OpenAI-compatible) + executeTool() dispatcher
  memory.ts     loadMemory / writeMemory / readMemory — Neon agent_memory table
  skills.ts     loadSkills() — reads skills/*/SKILL.md into system prompt

src/lib/agent/
  snapshot.ts   snapshotInventory() — joins inventory + products, computes days_to_expiry
  flag.ts       flagItems() — expiry ≤7 days OR qty ≤ reorder_threshold
  supplier.ts   fetchSupplierPrices() — TinyFish API for PFD / Bidvest / Harris Farm
  reason.ts     reasonWithHermes() — second Hermes call for structured AgentReport JSON
  email.ts      buildEmailHtml() + sendDailyEmail() via Resend

src/workers/
  scanner.worker.ts   Browser Web Worker — loads YOLOv8n ONNX (cached via Cache API), runs inference, postMessages results

src/lib/scanner/
  inference.ts        postprocess(), nms(), computeIoU(), COCO_CLASSES — pure functions, testable in Vitest
  db.ts               Zone/scan/detection DB queries
  diff.ts             computeChange() — count diff logic
  types.ts            Zone, Scan, Detection, DetectResponse, ZoneWithStatus

src/app/scanner/
  page.tsx                Zone list page
  [zoneId]/ScanView.tsx   Camera feed, worker messaging, server fallback, save snapshot
  [zoneId]/page.tsx       Server component — fetches zone + last count
  zones/new/page.tsx      Add zone form

src/app/api/
  agent/run/route.ts    POST — triggers full pipeline (auth: Bearer AGENT_SECRET)
  inventory/route.ts    GET — current inventory snapshot
  runs/route.ts         GET — recent 20 agent runs
  runs/[id]/route.ts    GET — single run detail

src/lib/db.ts     neon(DATABASE_URL) — tagged template sql client
src/types/index.ts  All shared types: Product, InventoryWithProduct, FlaggedItem, AgentReport, etc.

migrations/
  001_schema.sql        products, inventory, agent_runs, reorder_log
  002_agent_memory.sql  agent_memory table (key PK, value, updated_at)

skills/polaris-inventory/SKILL.md   Agent skill injected into system prompt
```

## Scanner Architecture

```
Phone camera → ScanView.tsx → Web Worker (YOLOv8n ONNX, browser, cached)
                            → POST /api/scanner/scans (save to Neon)
Fallback: Worker error → POST /api/scanner/detect → Render (Python FastAPI)
```

## Database

Neon serverless — use the `sql` tagged template from `@/lib/db`:

```ts
import { sql } from '@/lib/db'
const rows = await sql`SELECT * FROM products WHERE id = ${id}`
```

### Tables

- `products` — id (UUID PK), name, category, unit, reorder_threshold
- `inventory` — id (UUID PK), product_id (FK), quantity, expiry_date, location, updated_at
- `agent_runs` — id, created_at, status, report_json (JSONB), email_html, error_message
- `reorder_log` — id, run_id (FK), product_id (FK), supplier, live_price_aud, recommended_qty
- `agent_memory` — key (TEXT PK), value, updated_at

## How the Agent Works (Mental Model)

Polaris is an autonomous agent — not a chatbot. It acts on the world, observes results, and decides next steps without human input.

**Core loop:**
```
Goal → Perceive → Reason → Act → Observe → Reason again → repeat
```

1. System prompt is built: role + injected `agent_memory` rows + loaded skill files
2. LLM (GPT-OSS 20B via OpenRouter) decides which tool to call next — no hardcoded order
3. Tool executes (inventory check, price fetch, memory read/write...)
4. Result feeds back into context — LLM sees it and decides what to do next
5. Loop continues until LLM stops calling tools (finish_reason = stop, max 12 iterations)
6. Second LLM call (`reasonWithHermes`) synthesises structured JSON report
7. Email sent if any items flagged

**Memory = the autonomous intelligence layer:**
- `write_memory` tool lets the agent record observations (e.g. "Salmon margin dropped 4.5% this week")
- Next run: those rows are injected into the system prompt — agent compares against past notes
- Trends emerge without any human intervention

**To watch it work in real time:**
```bash
# Trigger a local run and watch tool calls in terminal logs
curl -X POST http://localhost:3000/api/agent/run \
  -H "Authorization: Bearer $AGENT_SECRET"
```
Each tool call that appears in the logs = one autonomous decision by the LLM.

**Verifying independence:** give the agent a degraded dataset (e.g. zero-out a price) and watch it flag, reason, and write a memory note without any prompting.

## Agent Loop — Critical Rules

- **Max 12 iterations** (`MAX_ITERATIONS` in loop.ts). Hard ceiling — never raise without reason.
- **strip `<think>` blocks** — Hermes 3 emits `<think>`, `<thinking>`, `<reasoning>` tags. `stripThinkBlocks()` removes them from the final response.
- **tool_choice: 'auto'** — the LLM decides which tools to call and in what order. Don't hardcode sequences.
- **temperature: 0.2** — low for deterministic inventory analysis. Don't raise above 0.3.
- **Memory is injected at loop start** — `agent_memory` rows are loaded once into the system prompt. Writes via `write_memory` tool take effect the *next* run, not the current one.
- **Skills are plain markdown** — `loadSkills()` reads all `skills/*/SKILL.md` files and appends them to the system prompt. Add new skills by creating a new `skills/<name>/SKILL.md`.

## Auth

`POST /api/agent/run` requires `Authorization: Bearer <AGENT_SECRET>`. All other API routes are unauthenticated (read-only data).

## Environment Variables

```env
DATABASE_URL=postgresql://...           # Neon connection string
OPENROUTER_API_KEY=sk-or-v1-...        # Hermes 3 access
TINYFISH_API_KEY=sk-tinyfish-...       # Live price scraping
RESEND_API_KEY=re_...                  # Email delivery
RESEND_FROM=Polaris <onboarding@resend.dev>
ADMIN_EMAIL=your@email.com             # Daily report recipient
AGENT_SECRET=...                       # Bearer token for /api/agent/run
NEXT_PUBLIC_AGENT_SECRET=...           # Client-side RunAgentButton
```

## Do Not

- Do not import `DATABASE_URL` directly — always use `sql` from `@/lib/db`
- Do not make the agent route unauthenticated — always check `AGENT_SECRET`
- Do not hardcode the tool execution order — the LLM decides (tool_choice: auto)
- Do not raise MAX_ITERATIONS without measuring cost impact (each iteration = one LLM call)
- Do not use `fetch` for Neon — always use the `sql` tagged template (handles connection pooling)
- Do not use npm/yarn/pnpm — bun only
- `reorder_log` inserts are wrapped in try/catch — failure is intentionally non-fatal, don't change that
- Email is only sent when `flagged.length > 0` — `buildEmailHtml` builds the preview, `sendDailyEmail` actually sends

## Health Stack

- typecheck: bun run tsc --noEmit
- test: bun run test

<p align="center">
  <img src="docs/polaris-logo.png" alt="Polaris" width="100">
</p>

<h1 align="center">Polaris — Autonomous Inventory Management Agent</h1>

<p align="center">
  Built for the <strong>Hourglass AI Challenge · May 2026</strong><br>
  <a href="https://polaris-agent.vercel.app">Live Demo</a> · <a href="https://github.com/Ansh0928/Polaris-Agent">GitHub</a> · <a href="https://hour-glass-ai-redesign.vercel.app/">Hourglass AI(re design)</a>
</p>

---

## What This Is

I run a fresh food business — [Tasman Star Seafood Market](https://tasmanstarseafoodmarket.com.au), an Australian seafood retailer. Every morning, someone has to check what's expiring, what's running low, and what to reorder from which supplier. That person is usually me.

I didn't build an app for that problem. I built an agent. One that wakes up every morning, checks the warehouse, reasons about what it finds, and acts — without being told to.

This is a working system in production, running against real inventory data, shipping daily. It made 22 tool calls in its first 7 days. Nobody prompted it once after setup.

The insight behind it: most SMBs run on hourly-wage workers. Any system that requires daily human engagement will fail. The real bottleneck isn't software — it's the human in the loop. **Polaris removes that human from the loop entirely.**

---

## Judging Criteria

### 01 · AI-Nativeness — Is the agent truly autonomous?

**Short answer:** Yes. No human touches it between runs.

Every morning at 5am AEST, Polaris wakes up, checks the warehouse, reasons about what it finds, and acts — all without a single prompt from a person. It decides which tools to call, in what order, based on what it observes. It writes notes to its own memory and reads them back next run. The only human involvement is reading the email it sends.

The deeper insight: the real bottleneck in any SMB system isn't the software — it's the staff. Hourly-wage workers won't change their routine for a new tool, no matter how simple it is. Polaris doesn't ask them to. It runs in the background, does the admin nobody wants to do, and gets out of the way.

---

### 02 · Creativity & Ambition — Bold ideas over safe ones

**Short answer:** Built a production AI agent with a $0 LLM bill.

After the IPOs of major AI companies, API prices will go up — that's a certainty. And in a world where privacy still matters, I didn't want warehouse data flowing through closed models. So I challenged myself: can I build a capable, production-grade agent entirely on open-source?

The fallback chain: **AWS EC2 → OpenRouter → Groq** — all open-source models, all free tier. The agent tries self-hosted Qwen3:14B first. If EC2 is cold, it falls to GPT-OSS 20B on OpenRouter, then Llama-3.3-70B on Groq. Three layers of redundancy. Running cost for the AI layer: effectively $0.

---

### 03 · Does It Work? — Show us it can handle the real world

**Short answer:** Yes. Live, running daily, real data.

Polaris is deployed at [polaris-agent.vercel.app](https://polaris-agent.vercel.app) and has been running against real inventory for 7+ days. In that window it made **22 tool calls**, flagged **10 expiring items**, identified **6 low-stock risks**, and generated purchase order recommendations — unprompted.

Every tool call is logged. Every decision is visible. Every memory write is queryable. Nothing is faked.

---

### 04 · Code Quality — How you think and build

**Short answer:** Built through my own workflow, tested, hardened, no shortcuts.

- TypeScript strict throughout — no `any`, shared types in `src/types/index.ts`
- Vitest unit tests on all pure functions (flagging logic, NMS, IoU, inference post-processing)
- Security reviewed: bearer auth on agent route, parameterised SQL only, XSS-safe email HTML builder
- Agentic loop guards: `MAX_ITERATIONS = 12`, `temperature = 0.2`, `<think>` block stripping, non-fatal reorder log writes
- Fallback chain wired in the LLM client — EC2 down doesn't break the run

---

## The Free AI Stack

This is the part I'm most proud of.

Post-IPO, the major AI companies will raise prices. And in a world where privacy increasingly matters, I didn't want to depend on sending warehouse data to closed APIs. So I challenged myself: **can I build a production-grade AI agent at near-zero cost?**

The answer is yes.

| Priority | Model | Where |
|---|---|---|
| Primary | Qwen3:14B (self-hosted) | AWS EC2 via Ollama |
| Fallback 1 | GPT-OSS 20B | OpenRouter (free tier) |
| Fallback 2 | Llama-3.3-70B | Groq (free tier) |

The agent tries EC2 first. If the instance is cold or unavailable, it falls through to OpenRouter, then Groq. Three layers of redundancy. All open-source. Running cost for the AI layer: effectively $0.

---

## Architecture

![Polaris Architecture Diagram](docs/architecture.png)

---

## Problems I Faced

The hardest part wasn't the code — it was the infrastructure.

The original plan was to self-host the LLM locally on my Mac and expose it to production. Simple idea. I searched everywhere for how to make that work reliably — tunneling through Cloudflare was the first attempt. It didn't work. Kept hitting walls: connection drops, timeouts, no stable way to keep a local machine as a production dependency.

Eventually landed on AWS EC2. Setting up the instance, getting Ollama running, configuring IMDSv2 for metadata security, making the fallback chain reliable — that took far longer than any of the application code. But it worked, and it's the right architecture: a real server, not my laptop.

The lesson: **the jaggedness of building something new is that you don't know what you don't know.** You plan, hit a wall, search, pivot, and eventually find the path. That process is the job.

---

## Future Scope

- Implement best practices tailored to each organisation's operational needs.
- Propose moving from services to a product — an AI-native SaaS layer that SMBs subscribe to, not a one-time build. The repeatable value is in the agent running daily, not the initial setup.
- Build brand presence through AEO, GEO, and SEO — story-led companies build more trust than feature-led ones.

**Personally:**
I want to have an impact and be around people doing far better than me. I heard recently: *"if you're the best programmer at your company, you're at the wrong company."* I want to learn, take feedback, iterate, and grow — for myself and for whoever I'm building with.

---

## What It Does

Every morning at 5am AEST, Polaris runs autonomously:

- **Checks the warehouse** — full inventory snapshot with quantities, locations, and expiry dates
- **Expiry alerts** — flags anything expiring within 7 days before it becomes waste
- **Low stock alerts** — flags items below reorder threshold before shelves go empty
- **Intelligent ordering** — fetches live prices from multiple suppliers and recommends the best reorder option
- **Margin intelligence** — compares wholesale cost prices against live retail prices, detects erosion trends
- **Emails a report** — full daily summary delivered before the warehouse opens
- **Remembers** — writes observations to persistent memory, so each run is informed by the last

> *"Salmon margin dropped 4.5% this week — supplier price spike noted. Recommend holding reorder until next cycle."*

That's the agent reasoning across runs without being told to.

---

## Memory — How It Gets Smarter

After each run the agent writes key observations to a persistent `agent_memory` table:

```
key: "salmon_margin_trend"
value: "Week 1: 62%. Week 2: 57.5%. Declining — supplier spike on Atlantic salmon."
```

Next run, that row is injected into the system prompt. The agent reads its own history and reasons against it. Trends emerge without any human intervention — just the agent watching itself across time.

---

## Agent Tools

The LLM decides which tools to call and in what order — no hardcoded sequence.

| Tool | What it does |
|---|---|
| `check_inventory` | Full warehouse snapshot: quantities, expiry dates, cost prices, locations |
| `flag_alerts` | Items expiring ≤7 days or below reorder threshold |
| `check_website_prices` | Live retail prices from the public storefront |
| `fetch_supplier_prices` | Live AUD prices from PFD, Bidvest, Harris Farm |
| `create_purchase_order` | Drafts reorder for the best-priced supplier |
| `write_memory` | Persists observations across runs |
| `read_memory` | Loads prior context into the current run |

---

## Margin Intelligence

Each run the agent:
1. Gets warehouse cost prices via `check_inventory`
2. Gets live retail prices via `check_website_prices`
3. Calculates: `margin = (retail − cost) / retail × 100`
4. Flags erosion against memory from previous runs

Thresholds: **Healthy ≥ 45%** · **Warning 30–44%** · **Critical < 30%**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Neon serverless PostgreSQL |
| AI — Primary | Qwen3:14B via Ollama on AWS EC2 |
| AI — Fallback | GPT-OSS 20B via OpenRouter / Llama-3.3-70B via Groq |
| Retail Price Scraping | tasmanstarseafoodmarket.com.au API |
| Email | Resend |
| Deployment | Vercel |
| Scheduler | GitHub Actions cron |
| Styling | Tailwind CSS v4 |
| Package Manager | Bun |

---

## Setup

```bash
git clone https://github.com/Ansh0928/Polaris-Agent.git
cd Polaris-Agent
bun install
cp .env.example .env.local   # fill in values
bunx tsx scripts/migrate.ts
bunx tsx scripts/seed-demo.ts
bun dev
```

Trigger manually:
```bash
curl -X POST http://localhost:3000/api/agent/run \
  -H "Authorization: Bearer your-agent-secret"
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-v1-...
RESEND_API_KEY=re_...
RESEND_FROM=Polaris <onboarding@resend.dev>
ADMIN_EMAIL=your@email.com
AGENT_SECRET=...
NEXT_PUBLIC_AGENT_SECRET=...
```

---

## License

MIT

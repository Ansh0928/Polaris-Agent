import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { sql } from '@/lib/db'
import { runAgentLoop } from '@/lib/agent/engine/loop'
import type { ToolCallEvent } from '@/lib/agent/engine/loop'
import { reasonWithHermes } from '@/lib/agent/reason'
import { sendDailyEmail, buildEmailHtml } from '@/lib/agent/email'
import type { PurchaseOrderSummary, FlaggedItem, SupplierResult, WebsitePrice, AgentReport } from '@/types'

export const maxDuration = 300

const DAILY_PROMPT = `Run the daily inventory analysis for this fresh food warehouse.
1. Check current inventory levels (note the cost_price_aud field on each product).
2. Flag any items expiring within 7 days or below reorder threshold.
3. For all flagged items, fetch live supplier prices from Australian foodservice suppliers.
4. Check live retail prices on the Tasman Star Seafood website using the check_website_prices tool.
5. Compare warehouse cost prices against website retail prices to identify margin health.
6. Save any useful margin trends, seasonal, or supplier observations to memory.
7. For each reorder recommendation, create a draft purchase order and log the decision.
When done, summarise your findings including both inventory alerts and margin intelligence.`

function buildFallbackReport(flagged: FlaggedItem[], supplierPrices: SupplierResult[], websitePrices: WebsitePrice[]): AgentReport {
  const now = new Date().toISOString()
  return {
    generated_at: now,
    expiry_alerts: flagged.filter((f) => f.reason === 'expiry' || f.reason === 'both').map((f) => ({
      product_name: f.inventory.product.name,
      quantity: f.inventory.quantity,
      unit: f.inventory.product.unit,
      expiry_date: f.inventory.expiry_date ?? '',
      days_to_expiry: f.inventory.days_to_expiry ?? 0,
      location: f.inventory.location,
    })),
    low_stock_alerts: flagged.filter((f) => f.reason === 'low_stock' || f.reason === 'both').map((f) => ({
      product_name: f.inventory.product.name,
      quantity: f.inventory.quantity,
      unit: f.inventory.product.unit,
      threshold: f.inventory.product.reorder_threshold,
      location: f.inventory.location,
    })),
    reorder_recommendations: [],
    supplier_prices: supplierPrices,
    website_prices: websitePrices,
    margin_alerts: [],
    summary: `[Synthesis unavailable — ${flagged.length} items flagged. Raw data preserved in tool trace.]`,
  }
}

async function getCompetitorErrors(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT name, last_result
      FROM competitor_sources
      WHERE last_result->>'error' IS NOT NULL
        AND last_scraped_at > now() - interval '7 days'
    `
    return rows.map((r) => `${r.name}: ${(r.last_result as { error?: string })?.error ?? 'unknown error'}`)
  } catch {
    return []
  }
}

async function fetchDraftPurchaseOrders(runId: string): Promise<PurchaseOrderSummary[]> {
  const rows = await sql`
    SELECT
      po.id,
      po.approve_token,
      po.qty,
      po.supplier,
      po.price_per_unit_aud,
      po.agent_reason,
      po.status,
      po.created_at,
      p.name AS product_name,
      p.unit AS unit
    FROM purchase_orders po
    JOIN products p ON po.product_id = p.id
    WHERE po.run_id = ${runId}::uuid
      AND po.status = 'draft'
  `
  return rows.map((row) => ({
    id: String(row.id),
    product_name: String(row.product_name),
    qty: Number(row.qty),
    unit: String(row.unit),
    supplier: String(row.supplier),
    price_per_unit_aud: row.price_per_unit_aud != null ? Number(row.price_per_unit_aud) : null,
    agent_reason: String(row.agent_reason ?? ''),
    approve_token: String(row.approve_token),
    status: row.status as PurchaseOrderSummary['status'],
    created_at: String(row.created_at),
  }))
}

function checkAuth(secret: string | null): boolean {
  const expected = process.env.AGENT_SECRET
  if (!secret || !expected) return false
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  } catch {
    return false
  }
}

async function createRunRow(): Promise<string> {
  const rows = await sql`
    INSERT INTO agent_runs (status) VALUES ('running') RETURNING id
  `
  return rows[0].id as string
}

async function streamAgentRun(req: NextRequest): Promise<Response> {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!checkAuth(secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ToolCallEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let runId: string | undefined
      try {
        runId = await createRunRow()

        const { flagged, allInventory, supplierPrices, websitePrices, toolTrace, reasoningBlocks } =
          await runAgentLoop(DAILY_PROMPT, send, runId)

        let report: Awaited<ReturnType<typeof reasonWithHermes>>
        try {
          report = await reasonWithHermes(flagged, supplierPrices, websitePrices, allInventory)
        } catch (reasonErr) {
          console.error('[route] reasonWithHermes failed — using minimal fallback report:', reasonErr)
          report = buildFallbackReport(flagged, supplierPrices, websitePrices)
        }
        const [purchaseOrders, competitorErrors] = await Promise.all([
          fetchDraftPurchaseOrders(runId),
          getCompetitorErrors(),
        ])

        const extendedReport = {
          ...report,
          tool_trace: toolTrace,
          reasoning_blocks: reasoningBlocks,
          purchase_orders: purchaseOrders,
        }

        const shouldEmail = flagged.length > 0 || websitePrices.length > 0 || competitorErrors.length > 0
        const emailHtml = shouldEmail
          ? await sendDailyEmail(report, competitorErrors.length > 0 ? competitorErrors : undefined)
          : buildEmailHtml(report)
        if (shouldEmail) send({ type: 'email_sent', output: process.env.ADMIN_EMAIL ?? '' })

        await sql`
          UPDATE agent_runs
          SET status = 'success', report_json = ${JSON.stringify(extendedReport)}::jsonb, email_html = ${emailHtml}
          WHERE id = ${runId}::uuid
        `

        for (const rec of report.reorder_recommendations) {
          const price = supplierPrices.find(
            (s) => s.product_name === rec.product_name && s.supplier === rec.supplier,
          )
          try {
            await sql`
              INSERT INTO reorder_log (run_id, product_id, supplier, live_price_aud, recommended_qty)
              VALUES (${runId}::uuid, ${rec.product_id}::uuid, ${rec.supplier}, ${price?.price_aud ?? null}, ${rec.recommended_qty})
            `
          } catch (err) {
            console.error('[route] reorder_log insert failed:', err, { runId, product: rec.product_name })
          }
        }

        send({ type: 'done', output: runId })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (runId) {
          await sql`UPDATE agent_runs SET status = 'error', error_message = ${message} WHERE id = ${runId}::uuid`
        } else {
          await sql`INSERT INTO agent_runs (status, error_message) VALUES ('error', ${message})`
        }
        send({ type: 'error', output: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!checkAuth(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  if (url.searchParams.get('stream') === 'true') {
    return streamAgentRun(req)
  }

  let runId: string | undefined
  try {
    runId = await createRunRow()

    const { flagged, allInventory, supplierPrices, websitePrices, toolTrace, reasoningBlocks } =
      await runAgentLoop(DAILY_PROMPT, undefined, runId)

    let report: Awaited<ReturnType<typeof reasonWithHermes>>
    try {
      report = await reasonWithHermes(flagged, supplierPrices, websitePrices, allInventory)
    } catch (reasonErr) {
      console.error('[route] reasonWithHermes failed — using minimal fallback report:', reasonErr)
      report = buildFallbackReport(flagged, supplierPrices, websitePrices)
    }
    const [purchaseOrders, competitorErrors] = await Promise.all([
      fetchDraftPurchaseOrders(runId),
      getCompetitorErrors(),
    ])

    const extendedReport = {
      ...report,
      tool_trace: toolTrace,
      reasoning_blocks: reasoningBlocks,
      purchase_orders: purchaseOrders,
    }

    const shouldEmail = flagged.length > 0 || websitePrices.length > 0 || competitorErrors.length > 0
    const emailHtml = shouldEmail
      ? await sendDailyEmail(report, competitorErrors.length > 0 ? competitorErrors : undefined)
      : buildEmailHtml(report)

    await sql`
      UPDATE agent_runs
      SET status = 'success', report_json = ${JSON.stringify(extendedReport)}::jsonb, email_html = ${emailHtml}
      WHERE id = ${runId}::uuid
    `

    for (const rec of report.reorder_recommendations) {
      const price = supplierPrices.find(
        (s) => s.product_name === rec.product_name && s.supplier === rec.supplier,
      )
      try {
        await sql`
          INSERT INTO reorder_log (run_id, product_id, supplier, live_price_aud, recommended_qty)
          VALUES (${runId}::uuid, ${rec.product_id}::uuid, ${rec.supplier}, ${price?.price_aud ?? null}, ${rec.recommended_qty})
        `
      } catch (err) {
        console.error('[route] reorder_log insert failed:', err, { runId, product: rec.product_name })
      }
    }

    return NextResponse.json({ ok: true, run_id: runId, alerts: flagged.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (runId) {
      await sql`UPDATE agent_runs SET status = 'error', error_message = ${message} WHERE id = ${runId}::uuid`
    } else {
      await sql`INSERT INTO agent_runs (status, error_message) VALUES ('error', ${message})`
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

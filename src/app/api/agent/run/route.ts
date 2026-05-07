import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { runAgentLoop } from '@/lib/agent/engine/loop'
import type { ToolCallEvent } from '@/lib/agent/engine/loop'
import { reasonWithHermes } from '@/lib/agent/reason'
import { sendDailyEmail, buildEmailHtml } from '@/lib/agent/email'

export const maxDuration = 300

const DAILY_PROMPT = `Run the daily inventory analysis for this fresh food warehouse.
1. Check current inventory levels (note the cost_price_aud field on each product).
2. Flag any items expiring within 7 days or below reorder threshold.
3. For all flagged items, fetch live supplier prices from Australian foodservice suppliers.
4. Check live retail prices on the Tasman Star Seafood website using the check_website_prices tool.
5. Compare warehouse cost prices against website retail prices to identify margin health.
6. Save any useful margin trends, seasonal, or supplier observations to memory.
When done, summarise your findings including both inventory alerts and margin intelligence.`

async function streamAgentRun(req: NextRequest): Promise<Response> {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ToolCallEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const { flagged, allInventory, supplierPrices, websitePrices, toolTrace, reasoningBlocks } =
          await runAgentLoop(DAILY_PROMPT, send)

        const report = await reasonWithHermes(flagged, supplierPrices, websitePrices, allInventory)
        const extendedReport = { ...report, tool_trace: toolTrace, reasoning_blocks: reasoningBlocks }

        const shouldEmail = flagged.length > 0 || websitePrices.length > 0
        const emailHtml = shouldEmail ? await sendDailyEmail(report) : buildEmailHtml(report)

        const runResult = await sql`
          INSERT INTO agent_runs (status, report_json, email_html)
          VALUES ('success', ${JSON.stringify(extendedReport)}::jsonb, ${emailHtml})
          RETURNING id
        `
        const runId = runResult[0].id

        for (const rec of report.reorder_recommendations) {
          const price = supplierPrices.find(
            (s) => s.product_name === rec.product_name && s.supplier === rec.supplier,
          )
          try {
            await sql`
              INSERT INTO reorder_log (run_id, product_id, supplier, live_price_aud, recommended_qty)
              VALUES (${runId}::uuid, ${rec.product_id}::uuid, ${rec.supplier}, ${price?.price_aud ?? null}, ${rec.recommended_qty})
            `
          } catch { /* non-fatal */ }
        }

        send({ type: 'done', output: runId })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await sql`INSERT INTO agent_runs (status, error_message) VALUES ('error', ${message})`
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
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.AGENT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SSE streaming mode: POST /api/agent/run?stream=true
  const url = new URL(req.url)
  if (url.searchParams.get('stream') === 'true') {
    return streamAgentRun(req)
  }

  try {
    const { flagged, allInventory, supplierPrices, websitePrices, toolTrace, reasoningBlocks } = await runAgentLoop(DAILY_PROMPT)

    const report = await reasonWithHermes(flagged, supplierPrices, websitePrices, allInventory)

    // Extend report_json with observability data
    const extendedReport = { ...report, tool_trace: toolTrace, reasoning_blocks: reasoningBlocks }

    const shouldEmail = flagged.length > 0 || websitePrices.length > 0
    const emailHtml = shouldEmail
      ? await sendDailyEmail(report)
      : buildEmailHtml(report)

    const runResult = await sql`
      INSERT INTO agent_runs (status, report_json, email_html)
      VALUES ('success', ${JSON.stringify(extendedReport)}::jsonb, ${emailHtml})
      RETURNING id
    `
    const runId = runResult[0].id

    for (const rec of report.reorder_recommendations) {
      const price = supplierPrices.find(
        (s) => s.product_name === rec.product_name && s.supplier === rec.supplier,
      )
      try {
        await sql`
          INSERT INTO reorder_log (run_id, product_id, supplier, live_price_aud, recommended_qty)
          VALUES (
            ${runId}::uuid,
            ${rec.product_id}::uuid,
            ${rec.supplier},
            ${price?.price_aud ?? null},
            ${rec.recommended_qty}
          )
        `
      } catch {
        // Reorder log failure is non-fatal
      }
    }

    return NextResponse.json({ ok: true, run_id: runId, alerts: flagged.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`INSERT INTO agent_runs (status, error_message) VALUES ('error', ${message})`
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

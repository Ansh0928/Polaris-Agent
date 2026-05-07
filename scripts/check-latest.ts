import { sql } from '@/lib/db'

async function main() {
  const rows = await sql`SELECT report_json FROM agent_runs ORDER BY ran_at DESC LIMIT 1`
  const report = rows[0]?.report_json as Record<string, unknown>
  const trace = (report?.tool_trace as Array<{tool: string; duration_ms: number; error?: string}>) ?? []
  console.log('Tool calls:', trace.length)
  for (const t of trace) {
    console.log(`  ${t.tool} ${t.duration_ms}ms${t.error ? ' ERROR: '+t.error.slice(0,60) : ''}`)
  }
  console.log('\nSummary:', String(report?.summary ?? '').slice(0, 200))
  console.log('Expiry alerts:', (report?.expiry_alerts as unknown[])?.length ?? 0)
  console.log('Supplier prices:', (report?.supplier_prices as unknown[])?.length ?? 0)
  console.log('Margin alerts:', (report?.margin_alerts as unknown[])?.length ?? 0)
}
main()

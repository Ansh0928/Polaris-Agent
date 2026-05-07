import { sql } from '@/lib/db'

async function main() {
  const id = process.argv[2] ?? '38f23573-559f-42a9-b1ab-c13ad6c2c65a'
  const rows = await sql`SELECT report_json FROM agent_runs WHERE id = ${id}::uuid`
  const report = rows[0]?.report_json as Record<string, unknown>
  const trace = (report?.tool_trace as Array<{tool: string; duration_ms: number; error?: string}>) ?? []
  console.log('Tool calls:', trace.length)
  for (const t of trace) {
    console.log(`  ${t.tool} ${t.duration_ms}ms${t.error ? ' ERROR: '+t.error.slice(0,60) : ''}`)
  }
  console.log('\nSummary:', report?.summary)
  console.log('Expiry alerts:', (report?.expiry_alerts as unknown[])?.length)
  console.log('Low stock alerts:', (report?.low_stock_alerts as unknown[])?.length)
  console.log('Reorder recs:', (report?.reorder_recommendations as unknown[])?.length)
  console.log('Supplier prices:', (report?.supplier_prices as unknown[])?.length)
  console.log('Margin alerts:', (report?.margin_alerts as unknown[])?.length)
  console.log('Memory writes:', trace.filter((t: {tool: string}) => t.tool === 'write_memory').length)
}
main()

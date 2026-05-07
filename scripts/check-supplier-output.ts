import { sql } from '@/lib/db'

async function main() {
  const rows = await sql`SELECT report_json FROM agent_runs WHERE id = '38f23573-559f-42a9-b1ab-c13ad6c2c65a'`
  const report = rows[0]?.report_json as Record<string, unknown>
  const trace = (report?.tool_trace as Array<{tool: string; output: string; error?: string}>) ?? []
  const supplierCall = trace.find((t: {tool: string}) => t.tool === 'fetch_supplier_prices')
  console.log('fetch_supplier_prices output:', supplierCall?.output?.slice(0, 500))
  console.log('error:', supplierCall?.error)
  
  const websiteCall = trace.find((t: {tool: string}) => t.tool === 'check_website_prices')
  console.log('\ncheck_website_prices output:', websiteCall?.output?.slice(0, 500))
  
  const memCall = trace.find((t: {tool: string}) => t.tool === 'write_memory')
  console.log('\nwrite_memory input:', JSON.stringify(memCall))
  
  console.log('\nMargin alerts:', JSON.stringify(report?.margin_alerts, null, 2))
}
main()

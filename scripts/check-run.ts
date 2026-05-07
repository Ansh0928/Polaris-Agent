import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const id = process.argv[2] ?? '1db2ca83-39af-4bbe-9629-5ce8ac49dd90'
  const rows = await sql`
    SELECT
      report_json->>'summary' as summary,
      report_json->'margin_alerts' as margins,
      jsonb_array_length(report_json->'website_prices') as wp_count,
      email_html IS NOT NULL as has_email
    FROM agent_runs
    WHERE id = ${id}
  `
  const r = rows[0]
  console.log('Summary:', r?.summary)
  console.log('Website prices count:', r?.wp_count)
  console.log('Margin alerts count:', Array.isArray(r?.margins) ? r.margins.length : 0)
  if (Array.isArray(r?.margins) && r.margins.length > 0) {
    console.log('\nMargin alerts:')
    for (const m of r.margins as Array<{product_name: string, retail_price_aud: number, cost_price_aud: number, margin_pct: number, status: string}>) {
      console.log(`  ${m.product_name}: retail=$${m.retail_price_aud} cost=$${m.cost_price_aud} margin=${m.margin_pct}% [${m.status}]`)
    }
  }
  console.log('Email sent:', r?.has_email)
}

main().catch((e) => { console.error(e); process.exit(1) })

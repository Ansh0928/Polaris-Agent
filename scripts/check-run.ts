import { sql } from '@/lib/db'

async function main() {
  const rows = await sql`SELECT report_json FROM agent_runs WHERE id = '96681127-98e7-459f-93ba-d2d89a2ce1bb'`
  console.log(JSON.stringify(rows[0]?.report_json, null, 2))
}
main()

import { sql } from '@/lib/db'

async function main() {
  const result = await sql`
    UPDATE agent_runs
    SET status = 'error', error_message = 'Run orphaned — HTTP client disconnected before completion'
    WHERE status = 'running'
    RETURNING id
  `
  console.log(`Fixed ${result.length} stuck runs:`, result.map((r: { id: string }) => r.id))
}
main()

import { sql } from '@/lib/db'

async function main() {
  const rows = await sql`SELECT id, status, ran_at, error_message FROM agent_runs ORDER BY ran_at DESC LIMIT 5`
  for (const r of rows) {
    console.log(r.id, r.status, String(r.ran_at).slice(0,19), r.error_message?.slice(0,100) ?? '')
  }
}
main()

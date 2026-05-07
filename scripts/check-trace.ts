import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const sql = neon(process.env.DATABASE_URL!)
async function main() {
  const id = process.argv[2] ?? '1bc59193-e5f7-4620-8aae-3136a0ce8c80'
  const rows = await sql`SELECT report_json->'tool_trace' as trace FROM agent_runs WHERE id = ${id}`
  const trace = rows[0]?.trace as Array<{tool: string, output: string, duration_ms: number, error?: string}>
  if (Array.isArray(trace)) {
    console.log('Tool calls:', trace.length)
    for (const t of trace) {
      console.log(' -', t.tool, t.duration_ms + 'ms', t.error ? '[ERROR: ' + t.error + ']' : '')
      if (t.output) console.log('   out:', t.output.slice(0, 200))
    }
  } else {
    console.log('No trace found or empty:', typeof trace)
  }
}
main().catch(console.error)

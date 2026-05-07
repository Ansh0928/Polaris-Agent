import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, ran_at, status, error_message,
           report_json->>'flagged_count' AS flagged_count
    FROM agent_runs
    ORDER BY ran_at DESC
    LIMIT 20
  `
  return NextResponse.json(rows)
}

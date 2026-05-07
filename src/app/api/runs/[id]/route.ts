import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await sql`
    SELECT id, ran_at, status, error_message, report_json, email_html
    FROM agent_runs
    WHERE id = ${id}::uuid
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

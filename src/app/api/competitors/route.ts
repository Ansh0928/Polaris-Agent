import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, label, url, last_scraped_at, last_result, created_at
    FROM competitor_sources ORDER BY created_at ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { label, url } = body as { label?: string; url?: string }

  if (!label?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'label and url are required' }, { status: 400 })
  }

  try { new URL(url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO competitor_sources (label, url)
    VALUES (${label.trim()}, ${url.trim()})
    RETURNING id, label, url, last_scraped_at, last_result, created_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}

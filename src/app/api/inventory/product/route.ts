import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { name, category, unit, reorder_threshold } = await req.json()

  const result = await sql`
    INSERT INTO products (name, category, unit, reorder_threshold)
    VALUES (${name}, ${category}, ${unit}, ${reorder_threshold})
    ON CONFLICT (name) DO UPDATE SET
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      reorder_threshold = EXCLUDED.reorder_threshold
    RETURNING id
  `
  return NextResponse.json({ id: result[0].id })
}

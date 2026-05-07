import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT
      i.id, i.product_id, i.quantity, i.expiry_date::text, i.location,
      i.zone, i.unit, i.shelf, i.updated_at,
      p.name AS product_name, p.category, p.unit AS product_unit, p.reorder_threshold
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    ORDER BY i.expiry_date ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { product_id, quantity, expiry_date, location } = body

  if (!product_id || quantity == null || !expiry_date || !location) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await sql`
    INSERT INTO inventory (product_id, quantity, expiry_date, location)
    VALUES (${product_id}::uuid, ${quantity}, ${expiry_date}::date, ${location})
    RETURNING id
  `
  return NextResponse.json({ id: result[0].id }, { status: 201 })
}

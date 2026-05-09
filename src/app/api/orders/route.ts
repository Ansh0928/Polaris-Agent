import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT
      po.id,
      po.qty,
      po.supplier,
      po.price_per_unit_aud,
      po.agent_reason,
      po.status,
      po.created_at,
      po.expires_at,
      p.name AS product_name,
      p.unit AS unit
    FROM purchase_orders po
    JOIN products p ON po.product_id = p.id
    ORDER BY po.created_at DESC
    LIMIT 100
  `
  return NextResponse.json(
    rows.map((row) => ({
      id: String(row.id),
      product_name: String(row.product_name),
      qty: Number(row.qty),
      unit: String(row.unit),
      supplier: String(row.supplier),
      price_per_unit_aud: row.price_per_unit_aud != null ? Number(row.price_per_unit_aud) : null,
      agent_reason: String(row.agent_reason ?? ''),
      status: String(row.status),
      created_at: String(row.created_at),
      expires_at: String(row.expires_at),
    })),
  )
}

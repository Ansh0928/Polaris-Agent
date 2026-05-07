import { sql } from '@/lib/db'
import type { InventoryWithProduct } from '@/types'

export function computeDaysToExpiry(expiryDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDateStr)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / 86400000)
}

export async function snapshotInventory(): Promise<InventoryWithProduct[]> {
  const rows = await sql`
    SELECT
      i.id, i.product_id, i.quantity, i.expiry_date::text, i.location,
      i.zone, i.unit, i.shelf, i.updated_at,
      p.id AS p_id, p.name AS product_name, p.category, p.unit AS product_unit, p.reorder_threshold, p.cost_price_aud
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    ORDER BY i.expiry_date ASC
  `

  return rows.map((row) => {
    const structuredLocation =
      row.zone && row.unit && row.shelf
        ? `${row.zone} ${row.unit} — ${row.shelf} shelf`
        : (row.location as string)

    return {
      id: row.id,
      product_id: row.product_id,
      quantity: Number(row.quantity),
      expiry_date: row.expiry_date,
      location: structuredLocation,
      zone: row.zone ?? null,
      unit: row.unit != null ? Number(row.unit) : null,
      shelf: row.shelf ?? null,
      updated_at: row.updated_at,
      days_to_expiry: computeDaysToExpiry(row.expiry_date),
      product: {
        id: row.p_id,
        name: row.product_name,
        category: row.category,
        unit: row.product_unit,
        reorder_threshold: row.reorder_threshold,
        cost_price_aud: row.cost_price_aud != null ? Number(row.cost_price_aud) : null,
        created_at: '',
      },
    }
  })
}

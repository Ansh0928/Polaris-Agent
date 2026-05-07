import { sql } from '@/lib/db'
import { computeDaysToExpiry } from '@/lib/agent/snapshot'
import { InventoryTable } from '@/components/InventoryTable'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const rows = await sql`
    SELECT i.id, i.product_id, i.quantity, i.expiry_date::text, i.location, i.updated_at,
           p.name AS product_name, p.category, p.unit, p.reorder_threshold
    FROM inventory i JOIN products p ON p.id = i.product_id
    ORDER BY i.expiry_date ASC
  `

  const items = rows.map((r) => ({
    id: r.id as string,
    product_name: r.product_name as string,
    category: r.category as string,
    unit: r.unit as string,
    location: r.location as string,
    quantity: Number(r.quantity),
    reorder_threshold: Number(r.reorder_threshold),
    expiry_date: r.expiry_date as string,
    days_to_expiry: computeDaysToExpiry(r.expiry_date as string),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">Inventory</h1>
        <Link
          href="/inventory/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#1c2a47] border border-[#4f8ef7] text-[#4f8ef7] text-sm rounded-md hover:bg-[#4f8ef7] hover:text-white transition-colors"
        >
          <Plus size={15} />
          Add Item
        </Link>
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg">
        <InventoryTable rows={items} />
      </div>
    </div>
  )
}

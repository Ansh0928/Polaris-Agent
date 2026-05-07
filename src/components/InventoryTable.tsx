'use client'

import { AlertTriangle, TrendingDown } from 'lucide-react'

interface InventoryRow {
  id: string
  product_name: string
  category: string
  quantity: number
  unit: string
  expiry_date: string
  days_to_expiry: number
  location: string
  reorder_threshold: number
}

interface Props {
  rows: InventoryRow[]
  onDelete?: (id: string) => void
}

function getDaysColor(days: number) {
  if (days <= 3) return 'text-red-400'
  if (days <= 7) return 'text-amber-400'
  return 'text-[#8b949e]'
}

export function InventoryTable({ rows, onDelete }: Props) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-[#8b949e] text-sm">
        No inventory items. Add some to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#21262d]">
            {['Product', 'Category', 'Stock', 'Expiry', 'Location', 'Flags', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs text-[#8b949e] font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExpiring = row.days_to_expiry <= 7
            const isLowStock = row.quantity <= row.reorder_threshold
            return (
              <tr key={row.id} className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors">
                <td className="px-4 py-3 font-medium text-white">{row.product_name}</td>
                <td className="px-4 py-3 text-[#8b949e] capitalize">{row.category}</td>
                <td className="px-4 py-3 text-white">{row.quantity} {row.unit}</td>
                <td className={`px-4 py-3 ${getDaysColor(row.days_to_expiry)}`}>
                  {row.expiry_date} ({row.days_to_expiry}d)
                </td>
                <td className="px-4 py-3 text-[#8b949e]">{row.location}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {isExpiring && <AlertTriangle size={14} className="text-red-400" />}
                    {isLowStock && <TrendingDown size={14} className="text-amber-400" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row.id)}
                      className="text-xs text-[#555] hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

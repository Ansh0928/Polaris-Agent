'use client'

import { useEffect, useState } from 'react'
import { Search, MapPin, CheckCircle, AlertCircle, X, Thermometer, Wind, Box, Snowflake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ZONES = ['Fridge', 'Freezer', 'Dry Store', 'Cool Room'] as const
const ZONE_ICONS: Record<string, LucideIcon> = {
  Fridge: Thermometer,
  Freezer: Snowflake,
  'Dry Store': Box,
  'Cool Room': Wind,
}
const UNITS = [1, 2, 3, 4, 5, 6] as const
const SHELVES = ['Top', 'Mid', 'Bottom'] as const

interface InventoryRow {
  id: string
  product_name: string
  category: string
  location: string
  zone: string | null
  unit: number | null
  shelf: string | null
  quantity: number
  expiry_date: string
}

export default function PutAwayPage() {
  const [items, setItems] = useState<InventoryRow[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<InventoryRow | null>(null)
  const [zone, setZone] = useState<string | null>(null)
  const [unit, setUnit] = useState<number | null>(null)
  const [shelf, setShelf] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((rows) =>
        setItems(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rows.map((r: any) => ({
            id: r.id,
            product_name: r.product_name,
            category: r.category,
            location: r.location,
            zone: r.zone ?? null,
            unit: r.unit != null ? Number(r.unit) : null,
            shelf: r.shelf ?? null,
            quantity: Number(r.quantity),
            expiry_date: r.expiry_date,
          })),
        ),
      )
  }, [])

  const filtered =
    search.length >= 1
      ? items.filter((i) => i.product_name.toLowerCase().includes(search.toLowerCase()))
      : []

  function selectItem(item: InventoryRow) {
    setSelected(item)
    setZone(item.zone)
    setUnit(item.unit)
    setShelf(item.shelf)
    setSearch('')
    setToast(null)
  }

  function reset() {
    setSelected(null)
    setZone(null)
    setUnit(null)
    setShelf(null)
    setSearch('')
    setToast(null)
  }

  async function save() {
    if (!selected || !zone || !unit || !shelf) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${selected.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, unit, shelf }),
      })
      if (!res.ok) {
        const err = await res.json()
        setToast({ type: 'error', msg: err.error ?? 'Save failed' })
      } else {
        setToast({
          type: 'success',
          msg: `${selected.product_name} → ${zone} ${unit}, ${shelf} shelf`,
        })
        setItems((prev) =>
          prev.map((i) => (i.id === selected.id ? { ...i, zone, unit, shelf } : i)),
        )
        setTimeout(reset, 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!selected && !!zone && !!unit && !!shelf

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={18} className="text-[#4f8ef7]" />
            <h1 className="text-xl font-bold text-white">Put Away</h1>
          </div>
          <p className="text-sm text-[#8b949e]">Assign a shelf location to incoming stock</p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm font-medium border ${
              toast.type === 'success'
                ? 'bg-[#0f2d1a] border-[#27ae60] text-[#27ae60]'
                : 'bg-[#2d0f0f] border-[#e74c3c] text-[#e74c3c]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span className="flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)}>
              <X size={14} className="opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* Product search */}
        {!selected && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Search Product
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Salmon, Prawns, Milk..."
                className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#4f8ef7] transition-colors"
                autoFocus
              />
            </div>

            {filtered.length > 0 && (
              <div className="mt-2 rounded-xl border border-[#30363d] overflow-hidden">
                {filtered.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 bg-[#161b22] hover:bg-[#1c2a47] transition-colors text-left ${
                      idx < filtered.length - 1 ? 'border-b border-[#21262d]' : ''
                    }`}
                  >
                    <div>
                      <div className="text-white text-sm font-medium">{item.product_name}</div>
                      <div className="text-[#8b949e] text-xs mt-0.5">
                        {item.zone
                          ? `${item.zone} ${item.unit} · ${item.shelf} shelf`
                          : 'No location set'}
                      </div>
                    </div>
                    <span className="text-xs text-[#4f8ef7] bg-[#1c2a47] px-2.5 py-1 rounded-md shrink-0 ml-3">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}

            {search.length >= 1 && filtered.length === 0 && (
              <p className="text-sm text-[#555] mt-3 text-center">No products match "{search}"</p>
            )}
          </div>
        )}

        {/* Selected product card */}
        {selected && (
          <>
            <div className="flex items-center justify-between bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3.5 mb-6">
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">{selected.product_name}</div>
                <div className="text-[#8b949e] text-xs mt-0.5">
                  {selected.zone
                    ? `Currently: ${selected.zone} ${selected.unit} · ${selected.shelf} shelf`
                    : 'No location assigned yet'}
                </div>
              </div>
              <button
                onClick={reset}
                className="text-xs text-[#8b949e] hover:text-white transition-colors shrink-0 ml-4 flex items-center gap-1"
              >
                <X size={13} />
                Change
              </button>
            </div>

            {/* Zone */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                Zone
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ZONES.map((z) => (
                  <button
                    key={z}
                    onClick={() => setZone(z)}
                    className={`flex flex-col items-center justify-center py-5 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                      zone === z
                        ? 'border-[#4f8ef7] bg-[#1c2a47] text-[#4f8ef7] shadow-lg shadow-blue-900/20'
                        : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#4f8ef7] hover:text-white'
                    }`}
                  >
                    {(() => { const Icon = ZONE_ICONS[z]; return <Icon size={22} className="mb-1.5 opacity-80" /> })()}
                    <span>{z}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unit */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                Unit
              </label>
              <div className="grid grid-cols-6 gap-2">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`h-12 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                      unit === u
                        ? 'border-[#4f8ef7] bg-[#1c2a47] text-[#4f8ef7] shadow-lg shadow-blue-900/20'
                        : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#4f8ef7] hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Shelf */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
                Shelf
              </label>
              <div className="grid grid-cols-3 gap-3">
                {SHELVES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setShelf(s)}
                    className={`py-4 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                      shelf === s
                        ? 'border-[#4f8ef7] bg-[#1c2a47] text-[#4f8ef7] shadow-lg shadow-blue-900/20'
                        : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#4f8ef7] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky save bar */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0d1117] border-t border-[#21262d]">
          <div className="max-w-lg mx-auto">
            <button
              onClick={save}
              disabled={!canSave || saving}
              className={`w-full py-4 rounded-xl text-sm font-bold transition-all active:scale-[0.99] ${
                canSave && !saving
                  ? 'bg-[#4f8ef7] hover:bg-[#3b7de8] text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#161b22] border border-[#30363d] text-[#555] cursor-not-allowed'
              }`}
            >
              {saving
                ? 'Saving...'
                : canSave
                  ? `Save — ${zone} ${unit} · ${shelf} shelf`
                  : 'Select zone · unit · shelf to continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

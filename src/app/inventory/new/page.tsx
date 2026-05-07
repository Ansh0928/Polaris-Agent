'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const LOCATIONS = ['zone-a', 'zone-b', 'zone-c', 'freezer-1', 'freezer-2', 'chiller-1', 'chiller-2']

export default function NewInventoryPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    product_name: '',
    category: 'fish',
    unit: 'kg',
    reorder_threshold: '10',
    quantity: '',
    expiry_date: '',
    location: 'zone-a',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const prodRes = await fetch('/api/inventory/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.product_name,
          category: form.category,
          unit: form.unit,
          reorder_threshold: Number(form.reorder_threshold),
        }),
      })
      const { id: product_id } = await prodRes.json()

      const invRes = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id,
          quantity: Number(form.quantity),
          expiry_date: form.expiry_date,
          location: form.location,
        }),
      })
      if (!invRes.ok) throw new Error('Failed to create inventory item')
      router.push('/inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full bg-[#0d1117] border border-[#21262d] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#4f8ef7]'
  const labelClass = 'block text-xs text-[#8b949e] mb-1.5'

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className="text-[#8b949e] hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Inventory Item</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#21262d] rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Product Name</label>
            <input name="product_name" value={form.product_name} onChange={handleChange} required className={inputClass} placeholder="e.g. Atlantic Salmon" />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
              {['fish', 'meat', 'dairy', 'produce', 'other'].map((c) => (
                <option key={c} value={c} className="bg-[#0d1117]">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Unit</label>
            <input name="unit" value={form.unit} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input name="quantity" type="number" min="0" step="0.01" value={form.quantity} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reorder Threshold</label>
            <input name="reorder_threshold" type="number" min="0" value={form.reorder_threshold} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expiry Date</label>
            <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <select name="location" value={form.location} onChange={handleChange} className={inputClass}>
              {LOCATIONS.map((l) => (
                <option key={l} value={l} className="bg-[#0d1117]">{l}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="w-full py-2 bg-[#4f8ef7] hover:bg-[#3d7de0] disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
          {loading ? 'Saving...' : 'Add Item'}
        </button>
      </form>
    </div>
  )
}

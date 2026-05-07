'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewZonePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Zone name is required'); return }
    setSaving(true)
    const res = await fetch('/api/scanner/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null }),
    })
    if (res.ok) {
      router.push('/scanner')
      router.refresh()
    } else {
      setError('Failed to create zone')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/scanner" className="text-[#484f58] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-[22px] font-semibold text-white">Add Zone</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#21262d] rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-[12px] text-[#8b949e] mb-1.5">Zone Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cold Storage, Aisle 1"
            className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#8b949e] mb-1.5">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Back-left corner, shelves A–C"
            className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
          />
        </div>
        {error && <p className="text-[#f85149] text-[12px]">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-[#238636] text-white text-sm rounded-md hover:bg-[#2ea043] transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Zone'}
        </button>
      </form>
    </div>
  )
}

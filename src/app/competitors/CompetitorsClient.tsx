'use client'

import { useState } from 'react'
import { Globe, Plus, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import type { CompetitorSource } from '@/types'

export function CompetitorsClient({ initial }: { initial: CompetitorSource[] }) {
  const [sources, setSources] = useState<CompetitorSource[]>(initial)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add source')
        return
      }
      const newSource = await res.json()
      setSources((s) => [...s, newSource])
      setLabel('')
      setUrl('')
      setAdding(false)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    setSources((s) => s.filter((src) => src.id !== id))
  }

  return (
    <div className="space-y-5 max-w-[860px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Competitors</h1>
          <p className="text-[13px] text-[#8b949e] mt-0.5">
            Supplier and competitor URLs scraped on each agent run
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-[13px] rounded-md transition-colors"
        >
          <Plus size={14} />
          Add Source
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-5 space-y-4">
          <h2 className="text-[14px] font-semibold text-white">New Competitor Source</h2>
          {error && (
            <p className="text-[13px] text-[#f85149] flex items-center gap-1.5">
              <AlertCircle size={13} />{error}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] text-[#8b949e] mb-1">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. PFD Food Services"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#8b949e] mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://pfdfoodservice.com.au/seafood"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={submitting || !label.trim() || !url.trim()}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white text-[13px] rounded-md transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Source'}
            </button>
            <button
              onClick={() => { setAdding(false); setError('') }}
              className="px-4 py-2 text-[#8b949e] hover:text-white text-[13px] rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sources table */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Source</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Last Scraped</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Last Result</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[#484f58]">
                  No sources yet. Add a competitor or supplier URL above.
                </td>
              </tr>
            )}
            {sources.map((src) => {
              const priceCount = src.last_result?.prices?.length ?? 0
              const hasError = !!src.last_result?.error
              return (
                <tr key={src.id} className="border-b border-[#161b22] hover:bg-[#161b22] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Globe size={13} className="text-[#484f58] shrink-0" />
                      <div>
                        <p className="text-[#c9d1d9] font-medium">{src.label}</p>
                        <p className="text-[11px] text-[#484f58] truncate max-w-[280px]">{src.url}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#8b949e]">
                    {src.last_scraped_at ? (
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} />
                        {new Date(src.last_scraped_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    ) : (
                      <span className="text-[#484f58]">Never</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {src.last_result == null ? (
                      <span className="text-[#484f58]">—</span>
                    ) : hasError ? (
                      <span className="inline-flex items-center gap-1 text-[#f85149] text-[11px]">
                        <AlertCircle size={11} /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#3fb950] text-[11px]">
                        <CheckCircle size={11} /> {priceCount} price{priceCount !== 1 ? 's' : ''} found
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(src.id)}
                      className="text-[#484f58] hover:text-[#f85149] transition-colors"
                      title="Delete source"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

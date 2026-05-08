'use client'

import { useState, useTransition } from 'react'
import { Search, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { deleteMemoryEntry, updateMemoryEntry } from './actions'

type HistoryRow = { value: string; written_at: string; run_id: string | null }
type MemoryRow = {
  key: string
  value: string
  updated_at: string
  history_count: number
  history: HistoryRow[]
}

export function MemoryClient({ rows }: { rows: MemoryRow[] }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pending, startTransition] = useTransition()

  const filtered = rows.filter(
    (r) =>
      r.key.toLowerCase().includes(query.toLowerCase()) ||
      r.value.toLowerCase().includes(query.toLowerCase()),
  )

  function startEdit(key: string, current: string) {
    setEditing((e) => ({ ...e, [key]: current }))
  }

  function cancelEdit(key: string) {
    setEditing((e) => {
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  function saveEdit(key: string) {
    const value = editing[key]
    if (!value?.trim()) return
    startTransition(async () => {
      await updateMemoryEntry(key, value.trim())
      cancelEdit(key)
    })
  }

  function remove(key: string) {
    if (!confirm(`Delete memory "${key}"?`)) return
    startTransition(async () => {
      await deleteMemoryEntry(key)
    })
  }

  function toggleHistory(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by key or value…"
          className="w-full bg-[#0d1117] border border-[#21262d] rounded-md pl-8 pr-4 py-2 text-[13px] text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-[#484f58] text-center py-10">No entries match.</p>
      ) : (
        filtered.map((row) => {
          const editVal = editing[row.key]

          return (
            <div
              key={row.key}
              className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden hover:border-[#30363d] transition-colors"
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <code className="text-[#58a6ff] text-[12px] font-mono font-semibold break-all">{row.key}</code>
                  <div className="flex items-center gap-1 shrink-0">
                    {editVal !== undefined ? (
                      <>
                        <button
                          onClick={() => saveEdit(row.key)}
                          disabled={pending}
                          className="p-1.5 rounded hover:bg-[#161b22] text-[#3fb950] transition-colors"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => cancelEdit(row.key)}
                          className="p-1.5 rounded hover:bg-[#161b22] text-[#8b949e] transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(row.key, row.value)}
                          className="p-1.5 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => remove(row.key)}
                          disabled={pending}
                          className="p-1.5 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-[#f85149] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editVal !== undefined ? (
                  <textarea
                    value={editVal}
                    onChange={(e) => setEditing((ed) => ({ ...ed, [row.key]: e.target.value }))}
                    className="w-full mt-2 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] resize-none transition-colors"
                    rows={4}
                    autoFocus
                  />
                ) : (
                  <p className="text-[13px] text-[#8b949e] mt-1.5 leading-relaxed">{row.value}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-[#484f58]">
                    Updated {new Date(row.updated_at).toLocaleString('en-AU', {
                      timeZone: 'Australia/Sydney',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  {row.history_count > 0 && (
                    <button
                      onClick={() => toggleHistory(row.key)}
                      className="flex items-center gap-1 text-[11px] text-[#484f58] hover:text-[#8b949e] transition-colors"
                    >
                      {row.history_count} {row.history_count === 1 ? 'write' : 'writes'}
                      {expanded[row.key] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                </div>
              </div>

              {/* History */}
              {expanded[row.key] && row.history.length > 0 && (
                <div className="border-t border-[#161b22] px-5 py-3 space-y-2 bg-[#090d12]">
                  {row.history.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[10px] text-[#484f58] whitespace-nowrap pt-0.5 shrink-0">
                        {new Date(h.written_at).toLocaleString('en-AU', {
                          timeZone: 'Australia/Sydney',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      <p className="text-[11px] text-[#8b949e] leading-snug">{h.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

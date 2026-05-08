import { sql } from '@/lib/db'
import { Brain } from 'lucide-react'
import { MemoryClient } from './MemoryClient'

export const dynamic = 'force-dynamic'

export default async function AgentMemoryPage() {
  const rows = await sql`
    SELECT
      m.key,
      m.value,
      m.updated_at,
      COUNT(h.id)::int AS history_count
    FROM agent_memory m
    LEFT JOIN agent_memory_history h ON h.key = m.key
    GROUP BY m.key, m.value, m.updated_at
    ORDER BY m.updated_at DESC
  `

  const historyByKey: Record<string, Array<{ value: string; written_at: string; run_id: string | null }>> = {}
  if (rows.length > 0) {
    const keys = rows.map((r) => r.key as string)
    const hist = await sql`
      SELECT key, value, written_at, run_id
      FROM agent_memory_history
      WHERE key = ANY(${keys})
      ORDER BY written_at DESC
    `
    for (const h of hist) {
      const k = h.key as string
      if (!historyByKey[k]) historyByKey[k] = []
      historyByKey[k].push({
        value: h.value as string,
        written_at: h.written_at as string,
        run_id: h.run_id as string | null,
      })
    }
  }

  const enriched = rows.map((r) => ({
    key: r.key as string,
    value: r.value as string,
    updated_at: r.updated_at as string,
    history_count: r.history_count as number,
    history: historyByKey[r.key as string] ?? [],
  }))

  return (
    <div className="space-y-5 max-w-[860px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold text-white">Agent Memory</h1>
        </div>
        <span className="text-[12px] text-[#484f58]">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <p className="text-[13px] text-[#8b949e]">
        Observations the agent accumulates across runs via the{' '}
        <code className="bg-[#161b22] px-1 rounded text-[#c9d1d9]">write_memory</code> tool.
        You can edit or delete entries manually.
      </p>

      {rows.length === 0 ? (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg flex flex-col items-center justify-center py-16 gap-3 text-[#484f58]">
          <Brain size={28} strokeWidth={1.5} />
          <p className="text-[13px]">No memories yet — trigger a run to watch the agent learn</p>
        </div>
      ) : (
        <MemoryClient rows={enriched} />
      )}
    </div>
  )
}

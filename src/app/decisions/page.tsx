import { sql } from '@/lib/db'
import { GitFork } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DecisionsPage() {
  const rows = await sql`
    SELECT
      d.id,
      d.action,
      d.reason,
      d.created_at,
      d.run_id,
      ar.ran_at,
      ar.status AS run_status
    FROM decision_log d
    LEFT JOIN agent_runs ar ON ar.id = d.run_id
    ORDER BY d.created_at DESC
    LIMIT 100
  `

  return (
    <div className="space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">Decisions</h1>
        <span className="text-[12px] text-[#484f58]">{rows.length} logged</span>
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-12 text-center">
          <GitFork size={28} className="mx-auto mb-3 text-[#484f58]" strokeWidth={1.5} />
          <p className="text-[#484f58] text-[13px]">No decisions logged yet.</p>
          <p className="text-[#484f58] text-[12px] mt-1">Trigger an agent run from Overview.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const ts = new Date(row.created_at as string).toLocaleString('en-AU', {
              timeZone: 'Australia/Sydney',
              dateStyle: 'short',
              timeStyle: 'short',
            })
            return (
              <div
                key={row.id as string}
                className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-4 hover:border-[#30363d] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#c9d1d9] leading-snug">{row.action as string}</p>
                    <p className="text-[12px] text-[#8b949e] mt-1 leading-snug">{row.reason as string}</p>
                  </div>
                  <span className="text-[11px] text-[#484f58] whitespace-nowrap shrink-0 mt-0.5">{ts}</span>
                </div>
                {row.run_id && (
                  <div className="mt-2 pt-2 border-t border-[#161b22] flex items-center gap-2">
                    <span className="text-[10px] text-[#484f58]">Run</span>
                    <a
                      href={`/runs/${row.run_id as string}`}
                      className="text-[10px] text-[#58a6ff] hover:underline font-mono"
                    >
                      {(row.run_id as string).slice(0, 8)}…
                    </a>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      row.run_status === 'error'
                        ? 'bg-[#f8514920] text-[#f85149]'
                        : 'bg-[#3fb95020] text-[#3fb950]'
                    }`}>
                      {row.run_status as string}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

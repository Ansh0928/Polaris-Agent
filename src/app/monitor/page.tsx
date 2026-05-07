import { sql } from '@/lib/db'
import { MonitorCharts } from './MonitorCharts'

export const dynamic = 'force-dynamic'

export default async function MonitorPage() {
  const rows = await sql`
    SELECT id, ran_at, status,
           jsonb_array_length(COALESCE(report_json->'tool_trace', '[]'::jsonb)) AS tool_calls,
           jsonb_array_length(COALESCE(report_json->'expiry_alerts', '[]'::jsonb)) +
           jsonb_array_length(COALESCE(report_json->'low_stock_alerts', '[]'::jsonb)) AS items_flagged,
           report_json->'tool_trace' AS tool_trace
    FROM agent_runs
    ORDER BY ran_at DESC LIMIT 30
  `

  const runs = rows.map((r) => {
    const trace = Array.isArray(r.tool_trace) ? r.tool_trace as Array<{ tool: string; error?: string }> : []
    const toolBreakdown: Record<string, number> = {}
    for (const t of trace) {
      toolBreakdown[t.tool] = (toolBreakdown[t.tool] ?? 0) + 1
    }
    return {
      id: r.id as string,
      ran_at: new Date(r.ran_at as string).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: 'short', day: 'numeric' }),
      status: r.status as string,
      tool_calls: Number(r.tool_calls ?? 0),
      items_flagged: Number(r.items_flagged ?? 0),
      tool_breakdown: toolBreakdown,
    }
  }).reverse()

  const allTools = Array.from(new Set(runs.flatMap((r) => Object.keys(r.tool_breakdown))))

  const totalRuns = runs.length
  const successRuns = runs.filter((r) => r.status === 'success').length
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
  const avgToolCalls = totalRuns > 0 ? (runs.reduce((s, r) => s + r.tool_calls, 0) / totalRuns).toFixed(1) : '0'
  const totalItemsFlagged = runs.reduce((s, r) => s + r.items_flagged, 0)

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[22px] font-semibold text-white">Monitor</h1>
        <p className="text-[13px] text-[#8b949e] mt-0.5">Agent performance over last 30 runs</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Runs', value: totalRuns },
          { label: 'Success Rate', value: `${successRate}%`, color: successRate >= 80 ? '#3fb950' : successRate >= 50 ? '#d29922' : '#f85149' },
          { label: 'Avg Tool Calls', value: avgToolCalls },
          { label: 'Items Flagged', value: totalItemsFlagged },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-4">
            <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-2">{label}</div>
            <div className="text-[28px] font-bold leading-none" style={{ color: color ?? '#e6edf3' }}>{value}</div>
          </div>
        ))}
      </div>

      <MonitorCharts runs={runs} allTools={allTools} />
    </div>
  )
}

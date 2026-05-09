import { sql } from '@/lib/db'
import { computeDaysToExpiry } from '@/lib/agent/snapshot'
import { RunAgentButton } from '@/components/RunAgentButton'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, TrendingDown, Activity, Wrench, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [inventoryRows, runRows] = await Promise.all([
    sql`
      SELECT i.id, i.quantity, i.expiry_date::text,
             p.name AS product_name, p.unit, p.reorder_threshold, p.category
      FROM inventory i JOIN products p ON p.id = i.product_id
      ORDER BY i.expiry_date ASC
    `,
    sql`
      SELECT id, ran_at, status, report_json
      FROM agent_runs ORDER BY ran_at DESC LIMIT 7
    `,
  ])

  const items = inventoryRows.map((r) => ({
    product_name: r.product_name as string,
    category: r.category as string,
    unit: r.unit as string,
    quantity: Number(r.quantity),
    reorder_threshold: Number(r.reorder_threshold),
    expiry_date: r.expiry_date as string,
    days_to_expiry: computeDaysToExpiry(r.expiry_date as string),
  }))

  const expiring = items.filter((r) => r.days_to_expiry <= 7)
  const lowStock = items.filter((r) => r.quantity <= r.reorder_threshold)
  const runs = runRows as Array<{ id: string; ran_at: string; status: string; report_json: { tool_trace?: Array<{ tool: string; error?: string }> } | null }>

  // Tool execution breakdown from all 7 recent runs
  const toolCounts: Record<string, { runs: number; errors: number }> = {}
  for (const run of runs) {
    const trace = run.report_json?.tool_trace ?? []
    for (const t of trace) {
      if (!toolCounts[t.tool]) toolCounts[t.tool] = { runs: 0, errors: 0 }
      toolCounts[t.tool].runs++
      if (t.error) toolCounts[t.tool].errors++
    }
  }

  const runsOk = runs.filter((r) => r.status === 'success').length
  const totalToolCalls = Object.values(toolCounts).reduce((s, v) => s + v.runs, 0)
  const criticalAlerts = [
    ...expiring.map((i) => ({ ...i, alertType: 'expiry' as const })),
    ...lowStock.filter((i) => i.days_to_expiry > 7).map((i) => ({ ...i, alertType: 'low_stock' as const })),
  ].slice(0, 8)

  // Bar chart data — 7 runs oldest→newest (pad with nulls if fewer)
  const chartRuns = [...runs].reverse()
  const maxToolCalls = Math.max(...chartRuns.map((r) => r.report_json?.tool_trace?.length ?? 0), 1)

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Hero header — logo embedded as background element */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d1117] border border-[#21262d] px-7 py-6">
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-white">Overview</h1>
            <p className="text-[13px] text-[#8b949e] mt-0.5">
              {runs[0]
                ? `Last run ${new Date(runs[0].ran_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })} AEST`
                : 'No runs yet'}
            </p>
          </div>
          <RunAgentButton />
        </div>
        <Image
          src="/polaris-logo.png"
          alt=""
          width={200}
          height={200}
          className="absolute -right-4 -top-8 opacity-[0.22] pointer-events-none select-none"
          aria-hidden
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Expiring Soon" value={expiring.length} accent={expiring.length > 0 ? '#f85149' : '#8b949e'} icon={<AlertTriangle size={14} />} />
        <StatBox label="Low Stock" value={lowStock.length} accent={lowStock.length > 0 ? '#d29922' : '#8b949e'} icon={<TrendingDown size={14} />} />
        <StatBox label="Runs (7d)" value={runs.length} accent="#8b949e" icon={<Activity size={14} />} />
        <StatBox label="Tool Calls (7d)" value={totalToolCalls} accent="#8b949e" icon={<Wrench size={14} />} />
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">
        {/* Left: Agent Observability */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#21262d]">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Agent Observability — last 7 days</span>
          </div>
          <div className="px-5 py-4">
            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5 h-16 mb-4">
              {Array.from({ length: 7 }, (_, i) => {
                const run = chartRuns[i]
                const isError = run?.status === 'error'
                const hasRun = !!run
                const toolCallCount = run?.report_json?.tool_trace?.length ?? 0
                const barPct = hasRun ? Math.max(10, Math.round((toolCallCount / maxToolCalls) * 90)) : 8
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${barPct}%`,
                        background: isError ? '#f85149' : hasRun ? '#1f6feb' : '#21262d',
                        minHeight: 4,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Tool breakdown table */}
            {Object.keys(toolCounts).length > 0 ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    <th className="text-left text-[#484f58] font-medium pb-2">Tool</th>
                    <th className="text-right text-[#484f58] font-medium pb-2">Calls</th>
                    <th className="text-right text-[#484f58] font-medium pb-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(toolCounts).map(([tool, counts]) => (
                    <tr key={tool} className="border-b border-[#161b22]">
                      <td className="py-2 text-[#c9d1d9] font-mono">{tool}</td>
                      <td className="py-2 text-right text-[#8b949e]">{counts.runs}</td>
                      <td className="py-2 text-right">
                        {counts.errors > 0 ? (
                          <span className="text-[#f85149]">{counts.errors}</span>
                        ) : (
                          <span className="text-[#3fb950]">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[13px] text-[#484f58]">No tool call data yet — trigger a run to populate.</p>
            )}
          </div>
        </div>

        {/* Right: Critical Alerts */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#21262d]">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Critical Alerts</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {criticalAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-[#3fb950] text-[13px] py-4">
                <CheckCircle size={14} />
                All inventory healthy
              </div>
            ) : (
              criticalAlerts.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#161b22] last:border-0">
                  <div className="mt-0.5">
                    {item.alertType === 'expiry' ? (
                      <XCircle size={12} className={item.days_to_expiry <= 3 ? 'text-[#f85149]' : 'text-[#d29922]'} />
                    ) : (
                      <AlertCircle size={12} className="text-[#d29922]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#c9d1d9] font-medium truncate">{item.product_name}</p>
                    <p className={`text-[11px] ${item.alertType === 'expiry' && item.days_to_expiry <= 3 ? 'text-[#f85149]' : 'text-[#d29922]'}`}>
                      {item.alertType === 'expiry'
                        ? `Expires in ${item.days_to_expiry}d`
                        : `Low stock: ${item.quantity} ${item.unit}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-[#21262d]">
            <Link href="/inventory" className="text-[12px] text-[#58a6ff] hover:underline">
              View all in Inventory →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#8b949e] uppercase tracking-wider">{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="text-[28px] font-bold leading-none" style={{ color: accent === '#8b949e' ? '#e6edf3' : accent }}>
        {value}
      </div>
    </div>
  )
}

import { sql } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import Link from 'next/link'
import type { AgentRun, AgentReport, ToolTrace, ReasoningBlock } from '@/types'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await sql`
    SELECT id, ran_at, status, report_json, email_html, error_message
    FROM agent_runs WHERE id = ${id}::uuid
  `
  if (!rows[0]) notFound()
  const run = rows[0] as unknown as AgentRun

  const report = run.report_json as AgentReport | null
  const toolTrace: ToolTrace[] = report?.tool_trace ?? []
  const reasoningBlocks: ReasoningBlock[] = report?.reasoning_blocks ?? []
  const expiryCount = report?.expiry_alerts?.length ?? 0
  const lowStockCount = report?.low_stock_alerts?.length ?? 0
  const marginCount = report?.margin_alerts?.length ?? 0
  const reorderCount = report?.reorder_recommendations?.length ?? 0
  const summary = report?.summary ?? null

  const getReasoningAt = (toolIndex: number) =>
    reasoningBlocks.filter((b) => b.after_tool_index === toolIndex)

  return (
    <div className="space-y-6 max-w-[860px]">
      <div className="flex items-center gap-3">
        <Link href="/runs" className="text-[#8b949e] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-[22px] font-semibold text-white">Run Detail</h1>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
          run.status === 'success'
            ? 'bg-[#3fb95020] text-[#3fb950]'
            : 'bg-[#f8514920] text-[#f85149]'
        }`}>
          {run.status === 'success' ? <CheckCircle size={10} /> : <XCircle size={10} />}
          {run.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px] text-[#8b949e]">
        <span className="flex items-center gap-1.5"><Clock size={12} />{new Date(run.ran_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'long', timeStyle: 'short' })} AEST</span>
        <span className="flex items-center gap-1.5"><Zap size={12} />{toolTrace.length} tool calls</span>
      </div>

      {/* Report summary stats */}
      {run.status === 'success' && report && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <SummaryChip label="Expiry Alerts" value={expiryCount} accent={expiryCount > 0 ? '#f85149' : '#3fb950'} />
            <SummaryChip label="Low Stock" value={lowStockCount} accent={lowStockCount > 0 ? '#d29922' : '#3fb950'} />
            <SummaryChip label="Margin Alerts" value={marginCount} accent={marginCount > 0 ? '#d29922' : '#3fb950'} />
            <SummaryChip label="Reorder Recs" value={reorderCount} accent={reorderCount > 0 ? '#58a6ff' : '#8b949e'} />
          </div>
          {summary && (
            <p className="text-[13px] text-[#8b949e] leading-relaxed border-t border-[#21262d] pt-4">{summary}</p>
          )}
        </div>
      )}

      {run.error_message && (
        <div className="bg-[#290d0d] border border-[#f8514940] rounded-lg p-4 text-[13px] text-[#f85149]">
          {run.error_message}
        </div>
      )}

      {/* Tool trace */}
      {toolTrace.length > 0 && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#21262d]">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Tool Trace</span>
          </div>
          <div className="divide-y divide-[#21262d]">
            {toolTrace.map((step, i) => {
              const stepReasoning = getReasoningAt(i - 1)
              return (
                <div key={i}>
                  {/* Reasoning block before this step */}
                  {stepReasoning.map((r, j) => (
                    <div key={j} className="mx-5 my-3 border-l-2 border-[#1f6feb] pl-4 py-2">
                      <p className="text-[11px] text-[#484f58] uppercase tracking-wider mb-1">Agent reasoning</p>
                      <p className="text-[13px] text-[#8b949e] italic leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                  <details className="group">
                    <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#161b22] list-none">
                      <span className="text-[11px] text-[#484f58] w-5 shrink-0">{i + 1}</span>
                      <span className="font-mono text-[13px] text-[#c9d1d9]">{step.tool}</span>
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        step.error
                          ? 'bg-[#f8514920] text-[#f85149]'
                          : 'bg-[#3fb95020] text-[#3fb950]'
                      }`}>
                        {step.error ? 'error' : 'ok'}
                      </span>
                      <span className="text-[11px] text-[#484f58]">{step.duration_ms}ms</span>
                    </summary>
                    <div className="px-5 pb-4 space-y-3">
                      <div>
                        <p className="text-[11px] text-[#484f58] uppercase tracking-wider mb-1">Input</p>
                        <pre className="bg-[#161b22] rounded p-3 text-[11px] text-[#8b949e] overflow-auto max-h-32">
                          {JSON.stringify(step.input, null, 2)}
                        </pre>
                      </div>
                      {step.error ? (
                        <div>
                          <p className="text-[11px] text-[#f85149] uppercase tracking-wider mb-1">Error</p>
                          <pre className="bg-[#290d0d] rounded p-3 text-[11px] text-[#f85149] overflow-auto max-h-32">{step.error}</pre>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] text-[#484f58] uppercase tracking-wider mb-1">Output</p>
                          <pre className="bg-[#161b22] rounded p-3 text-[11px] text-[#8b949e] overflow-auto max-h-48">
                            {(() => { try { return JSON.stringify(JSON.parse(step.output), null, 2) } catch { return step.output } })()}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Email preview */}
      {run.email_html && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#21262d]">
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Email Report Preview</span>
          </div>
          <iframe
            srcDoc={run.email_html}
            className="w-full"
            style={{ height: '700px', border: 'none' }}
            sandbox="allow-same-origin"
            title="Email report preview"
          />
        </div>
      )}
    </div>
  )
}

function SummaryChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-[#161b22] rounded-lg px-4 py-3">
      <p className="text-[10px] text-[#484f58] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[22px] font-bold leading-none" style={{ color: accent }}>{value}</p>
    </div>
  )
}

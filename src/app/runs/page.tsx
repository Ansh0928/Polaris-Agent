import { sql } from '@/lib/db'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
  const rows = await sql`
    SELECT id, ran_at, status, error_message,
           (report_json->'tool_trace') AS tool_trace,
           jsonb_array_length(COALESCE(report_json->'expiry_alerts', '[]'::jsonb)) +
           jsonb_array_length(COALESCE(report_json->'low_stock_alerts', '[]'::jsonb)) AS items_flagged
    FROM agent_runs
    ORDER BY ran_at DESC LIMIT 50
  `

  return (
    <div className="space-y-5 max-w-[900px]">
      <h1 className="text-[22px] font-semibold text-white">Logs</h1>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="text-left px-3 md:px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Time</th>
              <th className="text-left px-3 md:px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Status</th>
              <th className="text-left px-3 md:px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider hidden sm:table-cell">Tool Calls</th>
              <th className="text-left px-3 md:px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider hidden sm:table-cell">Items Flagged</th>
              <th className="px-3 md:px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#484f58]">
                  No runs yet. Trigger Polaris from Overview.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const toolTrace = Array.isArray(row.tool_trace) ? row.tool_trace : []
              const isError = row.status === 'error'
              return (
                <tr key={row.id as string} className="border-b border-[#161b22] hover:bg-[#161b22] transition-colors">
                  <td className="px-3 md:px-5 py-3 text-[#c9d1d9] whitespace-nowrap text-[12px]">
                    {new Date(row.ran_at as string).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 md:px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      isError
                        ? 'bg-[#f8514920] text-[#f85149]'
                        : 'bg-[#3fb95020] text-[#3fb950]'
                    }`}>
                      {isError ? <XCircle size={10} /> : <CheckCircle size={10} />}
                      {row.status as string}
                    </span>
                  </td>
                  <td className="px-3 md:px-5 py-3 text-[#8b949e] hidden sm:table-cell">{toolTrace.length}</td>
                  <td className="px-3 md:px-5 py-3 text-[#8b949e] hidden sm:table-cell">{Number(row.items_flagged ?? 0)}</td>
                  <td className="px-3 md:px-5 py-3 text-right">
                    <Link href={`/runs/${row.id as string}`} className="text-[#58a6ff] hover:underline text-[12px] whitespace-nowrap">
                      View →
                    </Link>
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

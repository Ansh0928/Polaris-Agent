import Link from 'next/link'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { AgentRun } from '@/types'

export function RunCard({ run }: { run: AgentRun }) {
  const alerts = run.report_json
    ? run.report_json.expiry_alerts.length + run.report_json.low_stock_alerts.length
    : 0

  return (
    <Link href={`/runs/${run.id}`} className="block">
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 hover:border-[#4f8ef7] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {run.status === 'success' ? (
              <CheckCircle size={15} className="text-green-400" />
            ) : (
              <XCircle size={15} className="text-red-400" />
            )}
            <span className="text-sm font-medium text-white capitalize">{run.status}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <Clock size={12} />
            {new Date(run.ran_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
          </div>
        </div>
        {run.status === 'success' && (
          <div className="text-xs text-[#8b949e]">{alerts} alert{alerts !== 1 ? 's' : ''} detected</div>
        )}
        {run.error_message && (
          <div className="text-xs text-red-400 mt-1 truncate">{run.error_message}</div>
        )}
      </div>
    </Link>
  )
}

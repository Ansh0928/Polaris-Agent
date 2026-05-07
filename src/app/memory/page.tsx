import { sql } from '@/lib/db'
import { Brain } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgentMemoryPage() {
  const rows = await sql`
    SELECT key, value, updated_at FROM agent_memory ORDER BY updated_at DESC
  `

  return (
    <div className="space-y-5 max-w-[860px]">
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-semibold text-white">Agent Memory</h1>
        <span className="text-[11px] text-[#484f58] uppercase tracking-wider">read-only</span>
      </div>
      <p className="text-[13px] text-[#8b949e]">
        Observations the agent has accumulated across runs — written autonomously via the <code className="bg-[#161b22] px-1 rounded text-[#c9d1d9]">write_memory</code> tool.
      </p>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#484f58]">
            <Brain size={28} strokeWidth={1.5} />
            <p className="text-[13px]">No memories yet — trigger a run to watch the agent learn</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider w-[200px]">Key</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Value</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider w-[160px]">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key as string} className="border-b border-[#161b22] hover:bg-[#161b22] transition-colors">
                  <td className="px-5 py-3">
                    <code className="text-[#c9d1d9] font-mono text-[12px]">{row.key as string}</code>
                  </td>
                  <td className="px-5 py-3 text-[#8b949e] leading-relaxed">{row.value as string}</td>
                  <td className="px-5 py-3 text-[#484f58]">
                    {new Date(row.updated_at as string).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

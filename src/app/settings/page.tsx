import { Settings } from 'lucide-react'

const ENV_VARS = [
  { key: 'DATABASE_URL', masked: true },
  { key: 'OPENROUTER_API_KEY', masked: true },
  { key: 'TINYFISH_API_KEY', masked: true },
  { key: 'RESEND_API_KEY', masked: true },
  { key: 'ADMIN_EMAIL', masked: false },
  { key: 'AGENT_SECRET', masked: true },
]

function maskValue(value: string | undefined): string {
  if (!value) return 'not set'
  return `${value.slice(0, 6)}${'•'.repeat(Math.max(0, value.length - 6))}`
}

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-[600px]">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-[#8b949e]" />
        <h1 className="text-[22px] font-semibold text-white">Settings</h1>
      </div>
      <p className="text-[13px] text-[#8b949e]">
        Environment configuration — set these in your <code className="bg-[#161b22] px-1 rounded text-[#c9d1d9]">.env.local</code> file or Vercel project settings.
      </p>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#21262d]">
          <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Environment Variables</span>
        </div>
        <div className="divide-y divide-[#161b22]">
          {ENV_VARS.map(({ key, masked }) => {
            const value = process.env[key]
            const display = masked ? maskValue(value) : (value ?? 'not set')
            const isSet = !!value
            return (
              <div key={key} className="flex items-center justify-between px-5 py-3">
                <code className="text-[13px] text-[#c9d1d9] font-mono">{key}</code>
                <div className="flex items-center gap-3">
                  <code className={`text-[12px] font-mono ${isSet ? 'text-[#8b949e]' : 'text-[#f85149]'}`}>
                    {display}
                  </code>
                  <span className={`w-2 h-2 rounded-full ${isSet ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

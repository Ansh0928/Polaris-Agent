import { Database, Bot, Mail, Key } from 'lucide-react'

const ENV_GROUPS: Array<{
  label: string
  icon: React.ReactNode
  vars: Array<{ key: string; label: string; masked: boolean; hint?: string }>
}> = [
  {
    label: 'Database',
    icon: <Database size={13} />,
    vars: [
      { key: 'DATABASE_URL', label: 'Connection String', masked: true, hint: 'Neon serverless PostgreSQL' },
    ],
  },
  {
    label: 'AI Model',
    icon: <Bot size={13} />,
    vars: [
      { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', masked: true, hint: 'Primary LLM provider' },
      { key: 'GROQ_API_KEY', label: 'Groq API Key', masked: true, hint: 'Cloud fallback when Ollama is unreachable' },
      { key: 'CLOUD_FALLBACK_MODEL', label: 'Fallback Model', masked: false, hint: 'Defaults to llama-3.3-70b-versatile' },
    ],
  },
  {
    label: 'Email',
    icon: <Mail size={13} />,
    vars: [
      { key: 'RESEND_API_KEY', label: 'Resend API Key', masked: true },
      { key: 'RESEND_FROM', label: 'Sender Address', masked: false },
      { key: 'ADMIN_EMAIL', label: 'Report Recipient', masked: true },
    ],
  },
  {
    label: 'API Keys',
    icon: <Key size={13} />,
    vars: [
      { key: 'TINYFISH_API_KEY', label: 'TinyFish API Key', masked: true, hint: 'Live price scraping' },
      { key: 'AGENT_SECRET', label: 'Agent Secret', masked: true, hint: 'Bearer token for POST /api/agent/run' },
      { key: 'NEXT_PUBLIC_APP_URL', label: 'App URL', masked: false, hint: 'Used in emails and redirects' },
    ],
  },
]

function maskValue(value: string | undefined): string {
  if (!value) return ''
  if (value.length <= 8) return '•'.repeat(value.length)
  return `${value.slice(0, 5)}${'•'.repeat(Math.min(12, value.length - 5))}${value.slice(-3)}`
}

function StatusDot({ isSet }: { isSet: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isSet ? 'bg-[#22c55e]' : 'bg-[#f85149]'}`}
      title={isSet ? 'Set' : 'Not set'}
    />
  )
}

export default function EnvPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-white">Environment Variables</h2>
        <p className="text-[13px] text-[#8b949e] mt-0.5">
          Set in <code className="bg-[#161b22] px-1.5 py-0.5 rounded text-[#c9d1d9] text-[11px]">.env.local</code> for local dev or in your{' '}
          <span className="text-[#58a6ff]">Vercel project settings</span> for production.
        </p>
      </div>

      <div className="space-y-3">
        {ENV_GROUPS.map((group) => (
          <div key={group.label} className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#21262d]">
              <span className="text-[#8b949e]">{group.icon}</span>
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">{group.label}</span>
            </div>
            <div className="divide-y divide-[#161b22]">
              {group.vars.map(({ key, label, masked, hint }) => {
                const rawValue = process.env[key]
                const isSet = !!rawValue
                const display = masked ? (rawValue ? maskValue(rawValue) : 'not set') : (rawValue ?? 'not set')
                return (
                  <div key={key} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusDot isSet={isSet} />
                          <code className="text-[12px] text-[#c9d1d9] font-mono">{key}</code>
                        </div>
                        {hint && <p className="text-[11px] text-[#6b7280] mt-0.5 ml-3.5">{hint}</p>}
                      </div>
                      <code className={`text-[12px] font-mono shrink-0 ${isSet ? 'text-[#8b949e]' : 'text-[#f85149]'}`}>
                        {display}
                      </code>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

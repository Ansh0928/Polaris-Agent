import { Users, Plug, Key, ChevronRight, Mail, Database, Bot, Globe } from 'lucide-react'

// ── Env var groups ────────────────────────────────────────────────────────────

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
      { key: 'ADMIN_EMAIL', label: 'Report Recipient', masked: false },
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

// ── Integrations ──────────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    name: 'Xero',
    description: 'Sync purchase orders and invoices to your accounting ledger automatically.',
    color: '#00B9E8',
    letter: 'X',
    category: 'Accounting',
    status: 'coming_soon' as const,
  },
  {
    name: 'Fresho',
    description: 'Push approved reorder recommendations directly as Fresho orders.',
    color: '#4CAF50',
    letter: 'F',
    category: 'Ordering',
    status: 'coming_soon' as const,
  },
  {
    name: 'TinyFish',
    description: 'Web scraping API for live competitor and supplier price data.',
    color: '#0066FF',
    letter: 'T',
    category: 'Pricing',
    envKey: 'TINYFISH_API_KEY',
    status: 'key_based' as const,
  },
  {
    name: 'Resend',
    description: 'Transactional email for daily inventory reports and alerts.',
    color: '#000000',
    letter: 'R',
    category: 'Email',
    envKey: 'RESEND_API_KEY',
    status: 'key_based' as const,
  },
  {
    name: 'GitHub Actions',
    description: 'Cron trigger — fires at 6am AEST daily to run the agent pipeline.',
    color: '#6e40c9',
    letter: 'G',
    category: 'Automation',
    status: 'configured' as const,
  },
]

// ── Members (static) ──────────────────────────────────────────────────────────

const MEMBERS = [
  { name: 'Admin', email: process.env.ADMIN_EMAIL ?? '—', role: 'Owner', initials: 'A' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskValue(value: string | undefined): string {
  if (!value) return ''
  if (value.length <= 8) return '•'.repeat(value.length)
  return `${value.slice(0, 5)}${'•'.repeat(Math.min(12, value.length - 5))}${value.slice(-3)}`
}

function StatusDot({ isSet }: { isSet: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${isSet ? 'bg-[#22c55e]' : 'bg-[#f85149]'}`}
      title={isSet ? 'Set' : 'Not set'}
    />
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-[680px]">

      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-semibold text-white">Settings</h1>
        <p className="text-[13px] text-[#8b949e] mt-0.5">
          Configure environment variables, team members, and third-party integrations.
        </p>
      </div>

      {/* ── Environment Variables ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-[#8b949e]" />
          <h2 className="text-[13px] font-semibold text-[#c9d1d9]">Environment Variables</h2>
        </div>
        <p className="text-[12px] text-[#6b7280] mb-4">
          Set in <code className="bg-[#161b22] px-1.5 py-0.5 rounded text-[#c9d1d9] text-[11px]">.env.local</code> for local dev or in your{' '}
          <span className="text-[#58a6ff]">Vercel project settings</span> for production.
        </p>

        <div className="space-y-3">
          {ENV_GROUPS.map((group) => {
            return (
              <div key={group.label} className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d] bg-[#0d1117]">
                  <span className="text-[#8b949e]">{group.icon}</span>
                  <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">{group.label}</span>
                </div>
                <div className="divide-y divide-[#161b22]">
                  {group.vars.map(({ key, label, masked, hint }) => {
                    const rawValue = process.env[key]
                    const isSet = !!rawValue
                    const display = masked ? (rawValue ? maskValue(rawValue) : 'not set') : (rawValue ?? 'not set')
                    return (
                      <div key={key} className="px-4 py-3">
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
            )
          })}
        </div>
      </section>

      {/* ── Members ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#8b949e]" />
            <h2 className="text-[13px] font-semibold text-[#c9d1d9]">Members</h2>
          </div>
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] text-[#8b949e] text-[12px] rounded-md opacity-60 cursor-not-allowed"
          >
            Invite member
          </button>
        </div>

        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
          <div className="divide-y divide-[#161b22]">
            {MEMBERS.map((m) => (
              <div key={m.email} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#238636] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {m.initials}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#c9d1d9] font-medium leading-none">{m.name}</p>
                    <p className="text-[11px] text-[#8b949e] mt-0.5">{m.email}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#238636] bg-[#238636]/10 border border-[#238636]/20 px-2 py-0.5 rounded">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Plug size={14} className="text-[#8b949e]" />
          <h2 className="text-[13px] font-semibold text-[#c9d1d9]">Integrations</h2>
        </div>

        <div className="space-y-2">
          {INTEGRATIONS.map((integration) => {
            const isConnected = integration.status === 'configured'
              || (integration.status === 'key_based' && !!process.env[integration.envKey!])

            return (
              <div
                key={integration.name}
                className="bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  {/* Brand avatar */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                    style={{ background: integration.color }}
                  >
                    {integration.letter}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#c9d1d9]">{integration.name}</span>
                      <span className="text-[10px] text-[#6b7280] bg-[#161b22] px-1.5 py-0.5 rounded">
                        {integration.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-0.5 max-w-[380px]">{integration.description}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {integration.status === 'coming_soon' ? (
                    <span className="text-[11px] text-[#6b7280] bg-[#161b22] border border-[#21262d] px-2.5 py-1 rounded">
                      Coming soon
                    </span>
                  ) : isConnected ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#22c55e]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-[#f85149]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f85149]" />
                      Not configured
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Agent config ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-[#8b949e]" />
          <h2 className="text-[13px] font-semibold text-[#c9d1d9]">Agent Schedule</h2>
        </div>
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-4 space-y-3">
          {[
            { label: 'Cron trigger', value: 'Daily 6:00am AEST (20:00 UTC)', mono: false },
            { label: 'Schedule expression', value: '0 20 * * *', mono: true },
            { label: 'Max iterations', value: '12 tool calls per run', mono: false },
            { label: 'Model temperature', value: '0.2', mono: true },
            { label: 'Timeout', value: '22s per LLM call (300s Vercel limit)', mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px] text-[#8b949e]">{label}</span>
              {mono
                ? <code className="text-[12px] font-mono text-[#c9d1d9] bg-[#161b22] px-2 py-0.5 rounded">{value}</code>
                : <span className="text-[12px] text-[#c9d1d9]">{value}</span>
              }
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

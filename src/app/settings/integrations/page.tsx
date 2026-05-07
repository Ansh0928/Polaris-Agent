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

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-white">Integrations</h2>
        <p className="text-[13px] text-[#8b949e] mt-0.5">Third-party services connected to Polaris.</p>
      </div>

      <div className="space-y-2">
        {INTEGRATIONS.map((integration) => {
          const isConnected =
            integration.status === 'configured' ||
            (integration.status === 'key_based' && !!process.env[integration.envKey!])

          return (
            <div
              key={integration.name}
              className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[13px] font-bold shrink-0"
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
                  <p className="text-[12px] text-[#6b7280] mt-0.5 max-w-[400px]">{integration.description}</p>
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
    </div>
  )
}

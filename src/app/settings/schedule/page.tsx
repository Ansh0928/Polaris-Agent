const SCHEDULE_ITEMS = [
  { label: 'Cron trigger', value: 'Daily 6:00am AEST (20:00 UTC)', mono: false },
  { label: 'Schedule expression', value: '0 20 * * *', mono: true },
  { label: 'Max iterations', value: '12 tool calls per run', mono: false },
  { label: 'Model temperature', value: '0.2', mono: true },
  { label: 'Timeout', value: '22s per LLM call (300s Vercel limit)', mono: false },
]

const PIPELINE_STEPS = [
  { step: '1', label: 'GitHub Actions cron fires', detail: 'Daily at 06:00 AEST (20:00 UTC)' },
  { step: '2', label: 'POST /api/agent/run', detail: 'Bearer auth check, run row pre-created' },
  { step: '3', label: 'runAgentLoop()', detail: 'Hermes tool loop — up to 12 iterations' },
  { step: '4', label: 'reasonWithHermes()', detail: 'Structured JSON report synthesis' },
  { step: '5', label: 'sendDailyEmail()', detail: 'Resend delivery if items are flagged' },
  { step: '6', label: 'agent_runs updated', detail: 'Status, report JSON, and email HTML saved' },
]

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-white">Agent Schedule</h2>
        <p className="text-[13px] text-[#8b949e] mt-0.5">Cron configuration and pipeline settings.</p>
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#21262d]">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Configuration</p>
        </div>
        <div className="divide-y divide-[#161b22]">
          {SCHEDULE_ITEMS.map(({ label, value, mono }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#8b949e]">{label}</span>
              {mono
                ? <code className="text-[12px] font-mono text-[#c9d1d9] bg-[#161b22] px-2 py-0.5 rounded">{value}</code>
                : <span className="text-[13px] text-[#c9d1d9]">{value}</span>
              }
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#21262d]">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Pipeline</p>
        </div>
        <div className="divide-y divide-[#161b22]">
          {PIPELINE_STEPS.map(({ step, label, detail }) => (
            <div key={step} className="px-5 py-3.5 flex items-start gap-3.5">
              <span className="w-5 h-5 rounded-full bg-[#161b22] border border-[#21262d] flex items-center justify-center text-[10px] font-bold text-[#8b949e] shrink-0 mt-0.5">
                {step}
              </span>
              <div>
                <p className="text-[13px] text-[#c9d1d9] font-medium">{label}</p>
                <p className="text-[12px] text-[#6b7280] mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

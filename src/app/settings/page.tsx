export default function SettingsGeneralPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-white">General</h2>
        <p className="text-[13px] text-[#8b949e] mt-0.5">Project information and configuration.</p>
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#21262d]">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Project</p>
        </div>
        <div className="divide-y divide-[#161b22]">
          {[
            { label: 'Name', value: 'Polaris' },
            { label: 'Description', value: 'Autonomous AI agent for fresh food warehouse inventory' },
            { label: 'Framework', value: 'Next.js (App Router)' },
            { label: 'Deployment', value: 'Vercel' },
            { label: 'Repository', value: 'github.com/Ansh0928/Polaris-Agent' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#8b949e]">{label}</span>
              <span className="text-[13px] text-[#c9d1d9]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#21262d]">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">Stack</p>
        </div>
        <div className="divide-y divide-[#161b22]">
          {[
            { label: 'Database', value: 'Neon serverless PostgreSQL' },
            { label: 'AI Provider', value: 'OpenRouter (GPT-OSS 20B)' },
            { label: 'Fallback AI', value: 'Groq (llama-3.3-70b-versatile)' },
            { label: 'Email', value: 'Resend' },
            { label: 'Styling', value: 'Tailwind CSS v4' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#8b949e]">{label}</span>
              <span className="text-[13px] text-[#c9d1d9]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

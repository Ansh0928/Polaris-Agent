const MEMBERS = [
  { name: 'Admin', email: process.env.ADMIN_EMAIL ?? '—', role: 'Owner', initials: 'A' },
]

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Members</h2>
          <p className="text-[13px] text-[#8b949e] mt-0.5">Manage who has access to this workspace.</p>
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
        <div className="px-5 py-3 border-b border-[#21262d] flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
            {MEMBERS.length} member{MEMBERS.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-[#161b22]">
          {MEMBERS.map((m) => (
            <div key={m.email} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#238636] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  {m.initials}
                </div>
                <div>
                  <p className="text-[13px] text-[#c9d1d9] font-medium leading-none">{m.name}</p>
                  <p className="text-[12px] text-[#8b949e] mt-0.5">{m.email}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#238636] bg-[#238636]/10 border border-[#238636]/20 px-2 py-0.5 rounded">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

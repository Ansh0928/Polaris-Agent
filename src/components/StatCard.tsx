import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
}

export function StatCard({ label, value, icon: Icon, color = '#4f8ef7' }: StatCardProps) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#8b949e] uppercase tracking-wider">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}

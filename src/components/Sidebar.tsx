'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, FileText, BarChart2,
  Inbox, Globe, Brain, Settings, Zap,
} from 'lucide-react'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/runs', icon: FileText, label: 'Logs' },
  { href: '/monitor', icon: BarChart2, label: 'Monitor' },
  { href: '/putaway', icon: Inbox, label: 'Put Away' },
  { href: '/competitors', icon: Globe, label: 'Competitors' },
  { href: '/memory', icon: Brain, label: 'Agent Memory' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-52 min-h-screen bg-[#0d1117] border-r border-[#21262d] flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#58a6ff]" />
          <span className="font-semibold text-white text-sm tracking-wide">Polaris</span>
        </div>
        <div className="text-[10px] text-[#484f58] mt-0.5 pl-6">Inventory Intelligence</div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                active
                  ? 'bg-[#1c2a3d] text-[#58a6ff]'
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
              }`}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings2, Key, Users, Plug, Globe } from 'lucide-react'

const sections = [
  {
    label: 'Workspace',
    items: [
      { href: '/settings', label: 'General', icon: Settings2, exact: true },
      { href: '/settings/schedule', label: 'Agent Schedule', icon: Globe },
    ],
  },
  {
    label: 'Connections',
    items: [
      { href: '/settings/env', label: 'Environment', icon: Key },
      { href: '/settings/integrations', label: 'Integrations', icon: Plug },
    ],
  },
  {
    label: 'Team',
    items: [
      { href: '/settings/members', label: 'Members', icon: Users },
    ],
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-[1000px] flex gap-8">
      {/* Left nav */}
      <aside className="w-44 shrink-0 pt-1">
        <div className="mb-6">
          <h1 className="text-[18px] font-semibold text-white">Settings</h1>
        </div>
        <nav className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-[#484f58] uppercase tracking-wider mb-1 px-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact ? pathname === href : pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                        active
                          ? 'bg-[#1c2a3d] text-[#58a6ff]'
                          : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]'
                      }`}
                    >
                      <Icon size={13} strokeWidth={1.8} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

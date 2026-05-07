'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, FileText, BarChart2,
  Inbox, Globe, Brain, Settings, Camera, Menu, X,
} from 'lucide-react'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/scanner', icon: Camera, label: 'Scanner' },
  { href: '/runs', icon: FileText, label: 'Logs' },
  { href: '/monitor', icon: BarChart2, label: 'Monitor' },
  { href: '/putaway', icon: Inbox, label: 'Put Away' },
  { href: '/competitors', icon: Globe, label: 'Competitors' },
  { href: '/memory', icon: Brain, label: 'Agent Memory' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function NavLinks({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <>
      {nav.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
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
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 min-h-screen bg-[#0d1117] border-r border-[#21262d] flex-col shrink-0">
        <div className="px-4 py-5 border-b border-[#21262d]">
          <div className="flex items-center gap-2.5">
            <Image src="/polaris-logo.png" alt="Polaris" width={32} height={32} className="rounded-md shrink-0" />
            <div>
              <span className="font-semibold text-white text-sm tracking-wide block leading-none">Polaris</span>
              <span className="text-[10px] text-[#484f58] leading-none">Inventory Intelligence</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          <NavLinks pathname={pathname} />
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#0d1117] border-b border-[#21262d]">
        <div className="flex items-center gap-2.5">
          <Image src="/polaris-logo.png" alt="Polaris" width={28} height={28} className="rounded-md shrink-0" />
          <span className="font-semibold text-white text-sm tracking-wide">Polaris</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-[#8b949e] hover:text-[#c9d1d9]"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-64 bg-[#0d1117] border-r border-[#21262d] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#21262d]">
              <div className="flex items-center gap-2.5">
                <Image src="/polaris-logo.png" alt="Polaris" width={28} height={28} className="rounded-md shrink-0" />
                <div>
                  <span className="font-semibold text-white text-sm tracking-wide block leading-none">Polaris</span>
                  <span className="text-[10px] text-[#484f58] leading-none">Inventory Intelligence</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              <NavLinks pathname={pathname} onNav={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

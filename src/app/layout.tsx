import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Sidebar } from '@/components/Sidebar'
import { DemoTour } from '@/components/DemoTour'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Polaris — Inventory Intelligence',
  description: 'Autonomous AI agent for fresh food warehouse inventory',
  icons: {
    icon: '/polaris-logo.png',
    shortcut: '/polaris-logo.png',
    apple: '/polaris-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 pt-14 md:pt-0 px-4 py-4 md:p-8 overflow-auto">{children}</main>
        </div>
        <DemoTour />
        <Analytics />
      </body>
    </html>
  )
}

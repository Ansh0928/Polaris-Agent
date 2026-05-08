import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-[48px] font-bold text-[#21262d]">404</p>
      <p className="text-[18px] font-medium text-[#c9d1d9]">Page not found</p>
      <p className="text-[13px] text-[#8b949e]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-2 flex items-center gap-1.5 text-[13px] text-[#58a6ff] hover:underline"
      >
        <ArrowLeft size={13} /> Back to Overview
      </Link>
    </div>
  )
}

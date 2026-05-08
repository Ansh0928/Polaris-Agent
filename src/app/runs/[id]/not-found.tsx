import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export default function RunNotFound() {
  return (
    <div className="space-y-6 max-w-[860px]">
      <div className="flex items-center gap-3">
        <Link href="/runs" className="text-[#8b949e] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-[22px] font-semibold text-white">Run Detail</h1>
      </div>
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-6 py-10 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={28} className="text-[#484f58]" strokeWidth={1.5} />
        <p className="text-[15px] font-medium text-[#c9d1d9]">Run not found</p>
        <p className="text-[13px] text-[#8b949e] max-w-sm">
          This run may have been deleted or the ID is incorrect.
        </p>
        <Link
          href="/runs"
          className="mt-2 text-[13px] text-[#58a6ff] hover:underline"
        >
          Back to Logs →
        </Link>
      </div>
    </div>
  )
}

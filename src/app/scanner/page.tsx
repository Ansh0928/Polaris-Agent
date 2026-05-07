import { getZones } from '@/lib/scanner/db'
import { computeChange } from '@/lib/scanner/diff'
import Link from 'next/link'
import { Camera, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ScannerPage() {
  const zones = await getZones()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">Warehouse Scanner</h1>
        <Link
          href="/scanner/zones/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#1c2a47] border border-[#4f8ef7] text-[#4f8ef7] text-sm rounded-md hover:bg-[#4f8ef7] hover:text-white transition-colors"
        >
          <Plus size={15} />
          Add Zone
        </Link>
      </div>

      {zones.length === 0 && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center text-[#484f58] text-sm">
          No zones yet. Add a zone to start scanning.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map((zone) => {
          const change = zone.lastScan
            ? computeChange(zone.lastScan.item_count, zone.previousScan?.item_count ?? null)
            : null

          const badgeStyle =
            !zone.lastScan
              ? 'bg-[#1c1c24] text-[#484f58] border-[#2d2d3a]'
              : change?.status === 'changed'
              ? 'bg-[#2d1e1e] text-[#f85149] border-[#5c2020]'
              : 'bg-[#0d2015] text-[#3fb950] border-[#1a4a2a]'

          const badgeLabel = !zone.lastScan
            ? 'Not scanned'
            : change?.status === 'changed'
            ? change.label
            : 'No change'

          return (
            <Link
              key={zone.id}
              href={`/scanner/${zone.id}`}
              className="block bg-[#0d1117] border border-[#21262d] rounded-lg p-4 hover:border-[#4f8ef7] transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#161b22] rounded-md group-hover:bg-[#1c2a47] transition-colors">
                    <Camera size={16} className="text-[#58a6ff]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-white">{zone.name}</div>
                    {zone.description && (
                      <div className="text-[12px] text-[#484f58] mt-0.5">{zone.description}</div>
                    )}
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full border font-mono shrink-0 ${badgeStyle}`}>
                  {badgeLabel}
                </span>
              </div>
              {zone.lastScan && (
                <div className="mt-3 text-[11px] text-[#484f58] font-mono">
                  Last scan: {new Date(zone.lastScan.scanned_at).toLocaleString()} ·{' '}
                  {zone.lastScan.item_count} items
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

import { getZone, getLatestTwoScans } from '@/lib/scanner/db'
import { notFound } from 'next/navigation'
import { ScanView } from './ScanView'

export const dynamic = 'force-dynamic'

export default async function ZoneScanPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params
  const zone = await getZone(zoneId)
  if (!zone) notFound()

  const scans = await getLatestTwoScans(zoneId)
  const lastCount = scans[0]?.item_count ?? null

  return <ScanView zoneId={zoneId} zoneName={zone.name} lastCount={lastCount} />
}

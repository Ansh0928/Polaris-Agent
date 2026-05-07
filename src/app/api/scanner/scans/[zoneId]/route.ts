import { NextRequest, NextResponse } from 'next/server'
import { getLatestTwoScans } from '@/lib/scanner/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const { zoneId } = await params
  const scans = await getLatestTwoScans(zoneId)
  return NextResponse.json(scans)
}

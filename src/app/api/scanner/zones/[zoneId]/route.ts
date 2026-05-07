import { NextRequest, NextResponse } from 'next/server'
import { getZone } from '@/lib/scanner/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const { zoneId } = await params
  const zone = await getZone(zoneId)
  if (!zone) return NextResponse.json({ error: 'zone not found' }, { status: 404 })
  return NextResponse.json(zone)
}

import { NextResponse } from 'next/server'
import { createScan } from '@/lib/scanner/db'

export async function POST(req: Request) {
  const { zoneId, itemCount, detections } = await req.json()
  if (!zoneId || itemCount === undefined) {
    return NextResponse.json({ error: 'zoneId and itemCount required' }, { status: 400 })
  }
  const scan = await createScan(zoneId, itemCount, detections ?? [])
  return NextResponse.json(scan, { status: 201 })
}

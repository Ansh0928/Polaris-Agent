import { NextResponse } from 'next/server'
import { getZones, createZone } from '@/lib/scanner/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const zones = await getZones()
  return NextResponse.json(zones)
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const zone = await createZone(name.trim(), description?.trim() ?? null)
  return NextResponse.json(zone, { status: 201 })
}

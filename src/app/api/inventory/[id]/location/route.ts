import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

const ZONES = ['Fridge', 'Freezer', 'Dry Store', 'Cool Room']
const SHELVES = ['Top', 'Mid', 'Bottom']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { zone, unit, shelf } = body

  if (!ZONES.includes(zone)) {
    return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })
  }
  if (!Number.isInteger(unit) || unit < 1 || unit > 6) {
    return NextResponse.json({ error: 'Unit must be 1–6' }, { status: 400 })
  }
  if (!SHELVES.includes(shelf)) {
    return NextResponse.json({ error: 'Invalid shelf' }, { status: 400 })
  }

  const result = await sql`
    UPDATE inventory
    SET zone = ${zone}, unit = ${unit}, shelf = ${shelf}, updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING id
  `

  if (!result.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id: result[0].id })
}

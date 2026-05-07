import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { quantity, expiry_date, location } = body

  await sql`
    UPDATE inventory
    SET
      quantity = COALESCE(${quantity}, quantity),
      expiry_date = COALESCE(${expiry_date}::date, expiry_date),
      location = COALESCE(${location}, location),
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM inventory WHERE id = ${id}::uuid`
  return NextResponse.json({ ok: true })
}

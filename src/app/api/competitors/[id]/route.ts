import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await sql`DELETE FROM competitor_sources WHERE id = ${id}::uuid`
  return NextResponse.json({ ok: true })
}

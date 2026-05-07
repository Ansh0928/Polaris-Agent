import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const rows = await sql`
    SELECT id, status, expires_at
    FROM purchase_orders
    WHERE approve_token = ${token}::uuid
  `

  if (!rows.length) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = rows[0]

  if (order.status !== 'draft') {
    return NextResponse.json({ message: `Order already ${order.status}` }, { status: 200 })
  }

  if (new Date(order.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'Approval link expired' }, { status: 410 })
  }

  await sql`
    UPDATE purchase_orders
    SET status = 'approved'
    WHERE id = ${order.id}::uuid AND status = 'draft'
  `

  return NextResponse.json({ ok: true, order_id: order.id, status: 'approved' })
}

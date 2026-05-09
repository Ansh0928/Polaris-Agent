import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://polaris-agent.vercel.app').replace(/\/$/, '')
}

/** bodyContent MUST contain only pre-escaped HTML — never pass raw user input directly */
function buildPage(title: string, bodyContent: string): string {
  const appUrl = getAppUrl()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #18181b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: #27272a; border: 1px solid #3f3f46; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; text-align: center; }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 28px; background: #ffffff; color: #18181b; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
    <a href="${appUrl}/runs" class="btn">View Dashboard</a>
  </div>
</body>
</html>`
}

function buildSuccessHtml(orderId: string): string {
  return buildPage('Order Approved', `
    <h1>Order Approved</h1>
    <p style="margin-top:8px;">Order <code style="font-family:monospace;background:#3f3f46;padding:2px 6px;border-radius:4px;">${esc(orderId)}</code> has been approved successfully.</p>
  `)
}

function buildAlreadyProcessedHtml(status: string): string {
  return buildPage(`Order Already ${esc(status)}`, `
    <h1>Order Already ${esc(status)}</h1>
    <p style="margin-top:8px;">This order has already been processed.</p>
  `)
}

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
    const html = buildAlreadyProcessedHtml(order.status)
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  if (new Date(order.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'Approval link expired' }, { status: 410 })
  }

  const updated = await sql`
    UPDATE purchase_orders
    SET status = 'approved'
    WHERE id = ${order.id}::uuid AND status = 'draft'
    RETURNING id
  `

  if (!updated.length) {
    const html = buildAlreadyProcessedHtml('approved')
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const html = buildSuccessHtml(order.id)
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

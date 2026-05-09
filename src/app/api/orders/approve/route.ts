import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

function buildSuccessHtml(orderId: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://polaris-agent.vercel.app').replace(/\/$/, '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Approved</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #18181b;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 48px 32px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    h1 {
      font-size: 32px;
      font-weight: 600;
      margin-bottom: 24px;
      color: #f4f4f5;
    }

    .order-id {
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 32px;
      word-break: break-all;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      color: #a1a1a6;
    }

    .order-id-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #71717a;
      margin-bottom: 8px;
      display: block;
    }

    a {
      display: inline-block;
      background: #3f3f46;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.2s;
      border: 1px solid #52525b;
    }

    a:hover {
      background: #52525b;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Order Approved</h1>
    <div class="order-id">
      <span class="order-id-label">Order ID</span>
      ${orderId}
    </div>
    <a href="${appUrl}/runs">View Dashboard</a>
  </div>
</body>
</html>`
}

function buildAlreadyProcessedHtml(status: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://polaris-agent.vercel.app').replace(/\/$/, '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Already ${status}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #18181b;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 48px 32px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    h1 {
      font-size: 32px;
      font-weight: 600;
      margin-bottom: 32px;
      color: #f4f4f5;
      text-transform: capitalize;
    }

    a {
      display: inline-block;
      background: #3f3f46;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.2s;
      border: 1px solid #52525b;
    }

    a:hover {
      background: #52525b;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Order Already ${status}</h1>
    <a href="${appUrl}/runs">View Dashboard</a>
  </div>
</body>
</html>`
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

  await sql`
    UPDATE purchase_orders
    SET status = 'approved'
    WHERE id = ${order.id}::uuid AND status = 'draft'
  `

  const html = buildSuccessHtml(order.id)
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

import { Resend } from 'resend'
import type { AgentReport, PurchaseOrderSummary } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function expiryBadge(days: number): string {
  if (days <= 0) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">Expired</span>`
  }
  if (days <= 3) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">${days}d left</span>`
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fffbeb;color:#b45309;border:1px solid #fde68a;">${days}d left</span>`
}

function marginBadge(status: string): string {
  if (status === 'healthy') return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;">Healthy</span>`
  if (status === 'warning') return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fffbeb;color:#b45309;border:1px solid #fde68a;">Warning</span>`
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">Critical</span>`
}

function section(accentColor: string, title: string, subtitle: string, tableHtml: string): string {
  return `
  <tr><td style="padding-bottom:12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="border-left:3px solid ${accentColor};padding:18px 24px 14px;">
          <span style="font-size:13px;font-weight:600;color:#111827;">${title}</span>
          <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${subtitle}</span>
        </td>
      </tr>
      <tr><td style="padding:0 24px 20px;">${tableHtml}</td></tr>
    </table>
  </td></tr>`
}

function dataTable(headers: string[], rows: string[]): string {
  const ths = headers.map((h, i) => `<th style="padding:0 0 10px ${i > 0 ? '16px' : '0'};text-align:${i === headers.length - 1 ? 'right' : 'left'};font-size:11px;font-weight:500;color:#9ca3af;white-space:nowrap;">${h}</th>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0">
    <thead><tr>${ths}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`
}

const TD = 'padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:middle;'

export function buildEmailHtml(report: AgentReport): string {
  const alertCount = report.expiry_alerts.length + report.low_stock_alerts.length
  const now = new Date(report.generated_at)
  const dateStr = now.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusDot = alertCount === 0 ? '#22c55e' : alertCount <= 3 ? '#f59e0b' : '#ef4444'
  const statusText = alertCount === 0 ? 'All clear' : `${alertCount} alert${alertCount !== 1 ? 's' : ''} need attention`

  // Expiry section
  const expiryRows = report.expiry_alerts.map((a, i) => {
    const last = i === report.expiry_alerts.length - 1
    const border = last ? 'border-bottom:none;' : ''
    return `<tr>
      <td style="${TD}${border}color:#111827;font-weight:500;">${esc(a.product_name)}</td>
      <td style="${TD}${border}color:#6b7280;padding-left:16px;">${a.quantity} ${esc(a.unit)}</td>
      <td style="${TD}${border}padding-left:16px;">${expiryBadge(a.days_to_expiry)}</td>
      <td style="${TD}${border}color:#9ca3af;text-align:right;">${esc(a.location)}</td>
    </tr>`
  })

  // Low stock section
  const lowStockRows = report.low_stock_alerts.map((a, i) => {
    const last = i === report.low_stock_alerts.length - 1
    const border = last ? 'border-bottom:none;' : ''
    return `<tr>
      <td style="${TD}${border}color:#111827;font-weight:500;">${esc(a.product_name)}</td>
      <td style="${TD}${border}color:#b45309;font-weight:600;padding-left:16px;">${a.quantity} ${esc(a.unit)}</td>
      <td style="${TD}${border}color:#9ca3af;padding-left:16px;">min ${a.threshold} ${esc(a.unit)}</td>
      <td style="${TD}${border}color:#9ca3af;text-align:right;">${esc(a.location)}</td>
    </tr>`
  })

  // Reorder section
  const reorderRows = report.reorder_recommendations.map((r, i) => {
    const last = i === report.reorder_recommendations.length - 1
    const border = last ? 'border-bottom:none;' : ''
    const cost = r.estimated_cost_aud != null ? `$${r.estimated_cost_aud.toFixed(2)}` : '—'
    return `<tr>
      <td style="${TD}${border}color:#111827;font-weight:500;">${esc(r.product_name)}</td>
      <td style="${TD}${border}color:#111827;padding-left:16px;">${r.recommended_qty} units</td>
      <td style="${TD}${border}color:#6b7280;padding-left:16px;">${esc(r.supplier)}</td>
      <td style="${TD}${border}color:#111827;font-weight:600;text-align:right;">${cost}</td>
    </tr>`
  })

  // Margin section
  const marginRows = (report.margin_alerts ?? []).map((m, i) => {
    const last = i === (report.margin_alerts ?? []).length - 1
    const border = last ? 'border-bottom:none;' : ''
    return `<tr>
      <td style="${TD}${border}color:#111827;font-weight:500;">${esc(m.product_name)}</td>
      <td style="${TD}${border}color:#111827;padding-left:16px;">$${m.retail_price_aud.toFixed(2)}</td>
      <td style="${TD}${border}color:#6b7280;padding-left:16px;">$${m.cost_price_aud.toFixed(2)}</td>
      <td style="${TD}${border}color:#111827;font-weight:700;padding-left:16px;">${m.margin_pct.toFixed(1)}%</td>
      <td style="${TD}${border}text-align:right;">${marginBadge(m.status)}</td>
    </tr>`
  })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://polaris-agent.vercel.app').replace(/\/$/, '')

  // Purchase orders section
  const pos = report.purchase_orders ?? []
  const purchaseOrderRows = pos.map((po: PurchaseOrderSummary, i: number) => {
    const last = i === pos.length - 1
    const border = last ? 'border-bottom:none;' : ''
    const cost = po.price_per_unit_aud != null
      ? `$${(po.price_per_unit_aud * po.qty).toFixed(2)}`
      : '—'
    const approveUrl = `${appUrl}/api/orders/approve?token=${encodeURIComponent(po.approve_token)}`
    return `<tr>
    <td style="${TD}${border}color:#111827;font-weight:500;">${esc(po.product_name)}</td>
    <td style="${TD}${border}color:#111827;padding-left:16px;">${po.qty} ${esc(po.unit)}</td>
    <td style="${TD}${border}color:#6b7280;padding-left:16px;">${esc(po.supplier)}</td>
    <td style="${TD}${border}color:#111827;font-weight:600;padding-left:16px;">${cost}</td>
    <td style="${TD}${border}text-align:right;padding-left:16px;">
      <a href="${approveUrl}" style="display:inline-block;padding:4px 12px;border-radius:6px;background:#18181b;color:#ffffff;text-decoration:none;font-size:11px;font-weight:600;">Approve</a>
    </td>
  </tr>`
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Polaris Daily Brief</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;">
<tr><td align="center" style="padding:32px 16px 40px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">

  <!-- Top bar -->
  <tr><td style="background:#18181b;border-radius:10px 10px 0 0;padding:20px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Polaris</span>
          <span style="font-size:12px;color:#71717a;margin-left:8px;">Inventory Intelligence</span>
        </td>
        <td align="right" style="font-size:12px;color:#52525b;">${esc(dateStr)}, ${timeStr} AEST</td>
      </tr>
    </table>
  </td></tr>

  <!-- Status banner -->
  <tr><td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:20px 28px 18px;">
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:10px;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusDot};"></span>
        </td>
        <td>
          <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.4px;">${statusText}</span>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;line-height:1.6;max-width:480px;">${esc(report.summary)}</p>
  </td></tr>

  <!-- Divider row -->
  <tr><td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:0 28px;">
    <div style="height:1px;background:#f3f4f6;"></div>
  </td></tr>

  <!-- Stat chips -->
  <tr><td style="background:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:16px 28px 20px;">
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:8px;">
          <span style="display:inline-block;padding:4px 12px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;font-weight:600;color:#dc2626;">${report.expiry_alerts.length} expiring</span>
        </td>
        <td style="padding-right:8px;">
          <span style="display:inline-block;padding:4px 12px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a;font-size:12px;font-weight:600;color:#b45309;">${report.low_stock_alerts.length} low stock</span>
        </td>
        <td>
          <span style="display:inline-block;padding:4px 12px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;font-weight:600;color:#1d4ed8;">${report.reorder_recommendations.length} reorders</span>
        </td>
        ${pos.length > 0 ? `
        <td style="padding-left:8px;">
          <span style="display:inline-block;padding:4px 12px;border-radius:6px;background:#ecfdf5;border:1px solid #6ee7b7;font-size:12px;font-weight:600;color:#059669;">${pos.length} orders pending</span>
        </td>` : ''}
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  ${report.expiry_alerts.length > 0 ? section('#ef4444', 'Expiry Alerts', `${report.expiry_alerts.length} item${report.expiry_alerts.length !== 1 ? 's' : ''}`, dataTable(['Product', 'Stock', 'Expires', 'Location'], expiryRows)) : ''}

  ${report.low_stock_alerts.length > 0 ? section('#f59e0b', 'Low Stock', `${report.low_stock_alerts.length} item${report.low_stock_alerts.length !== 1 ? 's' : ''}`, dataTable(['Product', 'Current', 'Minimum', 'Location'], lowStockRows)) : ''}

  ${report.reorder_recommendations.length > 0 ? section('#3b82f6', 'Reorder Plan', `${report.reorder_recommendations.length} item${report.reorder_recommendations.length !== 1 ? 's' : ''}`, dataTable(['Product', 'Qty', 'Supplier', 'Est. Cost'], reorderRows)) : ''}

  ${(report.purchase_orders ?? []).length > 0 ? section('#10b981', 'Draft Purchase Orders', `${(report.purchase_orders ?? []).length} awaiting approval`, dataTable(['Product', 'Qty', 'Supplier', 'Est. Cost', 'Action'], purchaseOrderRows)) : ''}

  ${(report.margin_alerts ?? []).length > 0 ? section('#8b5cf6', 'Margin Intelligence', 'retail vs cost', dataTable(['Product', 'Retail', 'Cost', 'Margin', 'Status'], marginRows)) : ''}

  <!-- CTA -->
  <tr><td style="padding:8px 0 4px;" align="center">
    <a href="${appUrl}/runs" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 28px;border-radius:8px;letter-spacing:0.1px;">
      Open Dashboard
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding-top:24px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Polaris runs daily at 6am AEST &mdash; <a href="${appUrl}" style="color:#9ca3af;">${appUrl.replace('https://', '')}</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function sendDailyEmail(report: AgentReport): Promise<string> {
  const html = buildEmailHtml(report)
  const alertCount = report.expiry_alerts.length + report.low_stock_alerts.length
  const dateShort = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: [process.env.ADMIN_EMAIL!],
    subject: alertCount === 0
      ? `Polaris — All clear · ${dateShort}`
      : `Polaris — ${alertCount} alert${alertCount !== 1 ? 's' : ''} · ${dateShort}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return html
}

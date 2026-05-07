import { Resend } from 'resend'
import type { AgentReport } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY!)

export function buildEmailHtml(report: AgentReport): string {
  const alertCount = report.expiry_alerts.length + report.low_stock_alerts.length
  const dateStr = new Date(report.generated_at).toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const heroColor = alertCount === 0 ? '#2ea04326' : alertCount <= 3 ? '#9e6a0326' : '#da363326'
  const heroAccent = alertCount === 0 ? '#2ea043' : alertCount <= 3 ? '#d29922' : '#f85149'
  const heroLabel = alertCount === 0 ? 'All Clear' : alertCount <= 3 ? 'Attention Required' : 'Urgent Action Needed'
  const heroIcon = alertCount === 0 ? '&#x2713;' : alertCount <= 3 ? '&#x26a0;' : '&#x26a0;'

  const expiryRows = report.expiry_alerts.map((a) => {
    const color = a.days_to_expiry <= 3 ? '#f85149' : '#d29922'
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:500;">${escHtml(a.product_name)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">${a.quantity} ${escHtml(a.unit)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:${color};font-weight:600;">${a.days_to_expiry}d (${escHtml(a.expiry_date)})</td>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:right;">${escHtml(a.location)}</td>
      </tr>`
  }).join('')

  const lowStockRows = report.low_stock_alerts.map((a) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:500;">${escHtml(a.product_name)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#d29922;font-weight:600;">${a.quantity} ${escHtml(a.unit)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Threshold: ${a.threshold} ${escHtml(a.unit)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:right;">${escHtml(a.location)}</td>
    </tr>`).join('')

  const reorderRows = report.reorder_recommendations.map((r) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:500;">${escHtml(r.product_name)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">${r.recommended_qty} units</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">${escHtml(r.supplier)}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;font-weight:600;">${r.estimated_cost_aud != null ? '$' + r.estimated_cost_aud.toFixed(2) : 'N/A'}</td>
    </tr>`).join('')

  const marginRows = (report.margin_alerts ?? []).map((m) => {
    const dotColor = m.status === 'healthy' ? '#2ea043' : m.status === 'warning' ? '#d29922' : '#f85149'
    const statusLabel = m.status.charAt(0).toUpperCase() + m.status.slice(1)
    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:500;">${escHtml(m.product_name)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">$${m.retail_price_aud.toFixed(2)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">$${m.cost_price_aud.toFixed(2)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:700;">${m.margin_pct.toFixed(1)}%</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${dotColor};">
          <span style="width:6px;height:6px;border-radius:50%;background:${dotColor};display:inline-block;"></span>
          ${statusLabel}
        </span>
      </td>
    </tr>`
  }).join('')

  const hasMargin = (report.margin_alerts ?? []).length > 0

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Polaris Daily Brief</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Polaris</td>
              <td align="right" style="font-size:13px;color:#9ca3af;">${escHtml(dateStr)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:${heroColor};border:1.5px solid ${heroAccent}33;border-radius:12px;padding:28px 32px;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:600;color:${heroAccent};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${heroIcon} ${heroLabel}</div>
          <div style="font-size:28px;font-weight:700;color:#111827;line-height:1.2;margin-bottom:8px;">${alertCount} alert${alertCount !== 1 ? 's' : ''} today</div>
          <div style="font-size:14px;color:#4b5563;line-height:1.6;">${escHtml(report.summary)}</div>
        </td></tr>

        <tr><td style="height:24px;"></td></tr>

        ${report.expiry_alerts.length > 0 ? `
        <!-- Expiry alerts -->
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#f85149;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Expiry Alerts &mdash; ${report.expiry_alerts.length} item${report.expiry_alerts.length !== 1 ? 's' : ''}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
              <th style="padding-bottom:8px;text-align:left;">Product</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Stock</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Expires</th>
              <th style="padding-bottom:8px;text-align:right;">Location</th>
            </tr></thead>
            <tbody>${expiryRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="height:12px;"></td></tr>
        ` : ''}

        ${report.low_stock_alerts.length > 0 ? `
        <!-- Low stock -->
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#d29922;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Low Stock &mdash; ${report.low_stock_alerts.length} item${report.low_stock_alerts.length !== 1 ? 's' : ''}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
              <th style="padding-bottom:8px;text-align:left;">Product</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Current</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Threshold</th>
              <th style="padding-bottom:8px;text-align:right;">Location</th>
            </tr></thead>
            <tbody>${lowStockRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="height:12px;"></td></tr>
        ` : ''}

        ${report.reorder_recommendations.length > 0 ? `
        <!-- Reorder plan -->
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#1f6feb;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Reorder Plan &mdash; ${report.reorder_recommendations.length} item${report.reorder_recommendations.length !== 1 ? 's' : ''}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
              <th style="padding-bottom:8px;text-align:left;">Product</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Qty</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Supplier</th>
              <th style="padding-bottom:8px;text-align:right;">Est. Cost</th>
            </tr></thead>
            <tbody>${reorderRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="height:12px;"></td></tr>
        ` : ''}

        ${hasMargin ? `
        <!-- Margin intelligence -->
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Margin Intelligence</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Retail vs warehouse cost</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
              <th style="padding-bottom:8px;text-align:left;">Product</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Retail</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Cost</th>
              <th style="padding-bottom:8px;padding-left:16px;text-align:left;">Margin</th>
              <th style="padding-bottom:8px;text-align:right;">Status</th>
            </tr></thead>
            <tbody>${marginRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="height:12px;"></td></tr>
        ` : ''}

        <!-- CTA -->
        <tr><td align="center" style="padding:8px 0 32px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? '#'}/runs" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">
            View Full Report
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Polaris &mdash; Autonomous Inventory Intelligence</p>
          <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Generated ${escHtml(dateStr)} AEST</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendDailyEmail(report: AgentReport): Promise<string> {
  const html = buildEmailHtml(report)
  const alertCount = report.expiry_alerts.length + report.low_stock_alerts.length

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: [process.env.ADMIN_EMAIL!],
    subject: `Polaris Daily Brief — ${alertCount} alert${alertCount !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('en-AU')}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return html
}

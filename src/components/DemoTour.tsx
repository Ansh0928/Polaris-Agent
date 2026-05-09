'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { BookOpen } from 'lucide-react'

const TOUR_KEY = 'polaris-tour-seen-v4'

const DEMO_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Polaris Daily Brief</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;">
<tr><td align="center" style="padding:24px 14px 28px;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

  <tr><td style="background:#18181b;border-radius:10px 10px 0 0;padding:16px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td><span style="font-size:14px;font-weight:700;color:#fff;letter-spacing:-0.2px;">Polaris</span><span style="font-size:11px;color:#71717a;margin-left:8px;">Inventory Intelligence</span></td>
        <td align="right" style="font-size:11px;color:#52525b;">Saturday, 9 May 2026, 05:00 AEST</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:18px 22px 14px;">
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:10px;vertical-align:middle;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;"></span></td>
        <td><span style="font-size:19px;font-weight:700;color:#111827;letter-spacing:-0.4px;">3 alerts need attention</span></td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:12px;color:#6b7280;line-height:1.6;max-width:440px;">Atlantic Salmon expires in 2 days. Tiger Prawns are critically low. Bidvest has Barramundi $0.80/kg cheaper than your current supplier.</p>
  </td></tr>

  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:0 22px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>

  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:12px 22px 16px;">
    <table cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td style="padding-right:8px;"><span style="display:inline-block;padding:3px 10px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;font-size:11px;font-weight:600;color:#dc2626;">1 expiring</span></td>
      <td style="padding-right:8px;"><span style="display:inline-block;padding:3px 10px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a;font-size:11px;font-weight:600;color:#b45309;">1 low stock</span></td>
      <td><span style="display:inline-block;padding:3px 10px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;font-size:11px;font-weight:600;color:#1d4ed8;">1 reorder</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="height:12px;"></td></tr>

  <tr><td style="padding-bottom:10px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr><td style="border-left:3px solid #ef4444;padding:13px 20px 11px;">
        <span style="font-size:12px;font-weight:600;color:#111827;">Expiry Alerts</span>
        <span style="font-size:11px;color:#9ca3af;margin-left:8px;">1 item</span>
      </td></tr>
      <tr><td style="padding:0 20px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead><tr>
            <th style="padding:0 0 7px 0;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Product</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Stock</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Expires</th>
            <th style="padding:0 0 7px 12px;text-align:right;font-size:10px;font-weight:500;color:#9ca3af;">Location</th>
          </tr></thead>
          <tbody><tr>
            <td style="padding:7px 0;font-size:12px;color:#111827;font-weight:500;">Atlantic Salmon</td>
            <td style="padding:7px 0;font-size:12px;color:#6b7280;padding-left:12px;">45 kg</td>
            <td style="padding:7px 0;font-size:12px;padding-left:12px;"><span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">2d left</span></td>
            <td style="padding:7px 0;font-size:12px;color:#9ca3af;text-align:right;">Zone A2</td>
          </tr></tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:10px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr><td style="border-left:3px solid #f59e0b;padding:13px 20px 11px;">
        <span style="font-size:12px;font-weight:600;color:#111827;">Low Stock</span>
        <span style="font-size:11px;color:#9ca3af;margin-left:8px;">1 item</span>
      </td></tr>
      <tr><td style="padding:0 20px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead><tr>
            <th style="padding:0 0 7px 0;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Product</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Current</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Minimum</th>
            <th style="padding:0 0 7px 12px;text-align:right;font-size:10px;font-weight:500;color:#9ca3af;">Location</th>
          </tr></thead>
          <tbody><tr>
            <td style="padding:7px 0;font-size:12px;color:#111827;font-weight:500;">Tiger Prawns</td>
            <td style="padding:7px 0;font-size:12px;color:#b45309;font-weight:600;padding-left:12px;">8 kg</td>
            <td style="padding:7px 0;font-size:12px;color:#9ca3af;padding-left:12px;">min 20 kg</td>
            <td style="padding:7px 0;font-size:12px;color:#9ca3af;text-align:right;">Zone B1</td>
          </tr></tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:10px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr><td style="border-left:3px solid #3b82f6;padding:13px 20px 11px;">
        <span style="font-size:12px;font-weight:600;color:#111827;">Reorder Plan</span>
        <span style="font-size:11px;color:#9ca3af;margin-left:8px;">1 item</span>
      </td></tr>
      <tr><td style="padding:0 20px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead><tr>
            <th style="padding:0 0 7px 0;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Product</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Qty</th>
            <th style="padding:0 0 7px 12px;text-align:left;font-size:10px;font-weight:500;color:#9ca3af;">Supplier</th>
            <th style="padding:0 0 7px 12px;text-align:right;font-size:10px;font-weight:500;color:#9ca3af;">Est. Cost</th>
          </tr></thead>
          <tbody><tr>
            <td style="padding:7px 0;font-size:12px;color:#111827;font-weight:500;">Barramundi</td>
            <td style="padding:7px 0;font-size:12px;color:#111827;padding-left:12px;">30 units</td>
            <td style="padding:7px 0;font-size:12px;color:#6b7280;padding-left:12px;">Bidvest</td>
            <td style="padding:7px 0;font-size:12px;color:#111827;font-weight:600;text-align:right;">$210.00</td>
          </tr></tbody>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:4px 0 2px;" align="center">
    <a href="/runs" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:12px;font-weight:600;padding:10px 24px;border-radius:8px;">Open Dashboard →</a>
  </td></tr>

  <tr><td style="padding-top:18px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#9ca3af;">Polaris runs daily at 6am AEST &mdash; this is a sample of the report you receive each morning</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

const steps = [
  {
    popover: {
      title: 'Meet Polaris',
      description:
        '<img src="/agent-hero.png" alt="Polaris AI Agent" class="tour-hero-img" />' +
        '<ul class="tour-points">' +
        '<li>Wakes up at 5am every morning</li>' +
        '<li>Scans cold storage via computer vision</li>' +
        '<li>Flags expiring items and low stock</li>' +
        '<li>Scrapes live competitor prices</li>' +
        '<li>Delivers a full report straight to your inbox</li>' +
        '</ul>' +
        '<div class="tour-email-iframe-mount"></div>',
      side: 'over' as const,
      align: 'center' as const,
    },
  },
  {
    element: '#tour-scanner',
    popover: {
      title: 'Camera Scanner',
      description:
        '<img src="/scanner-demo.jpg" alt="YOLOv8 live detection in cold storage" class="tour-scanner-img" />' +
        'Point any phone at a storage zone. YOLOv8 runs directly in the browser, identifying and counting items in real time. Every scan is logged and compared to the previous count.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-stats',
    popover: {
      title: 'Live Inventory Snapshot',
      description: 'Four numbers updated after every agent run. Red means expiring within 7 days. Yellow means below reorder threshold. These drive every decision the agent makes.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-run-btn',
    popover: {
      title: 'Run the Agent',
      description: 'Triggers a full agent run right now. Watch it call tools autonomously in the terminal with no fixed order. Normally scheduled at 5am every day via GitHub Actions.',
      side: 'bottom' as const,
      align: 'end' as const,
    },
  },
  {
    element: '#tour-observability',
    popover: {
      title: 'Agent Observability',
      description: 'Every tool called across the last 7 runs, with counts and error rates. The LLM decides what to call and when. Nothing is hardcoded.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-alerts',
    popover: {
      title: 'Critical Alerts',
      description: 'Items the agent flagged on its own. No rules written. The AI reads your inventory and decides what needs urgent attention.',
      side: 'top' as const,
      align: 'end' as const,
    },
  },
  {
    element: '#tour-nav-inventory',
    popover: {
      title: 'Inventory',
      description: 'Your full stock table. Every product with current quantity, expiry date, location, and colour-coded risk level. Filter by category or sort by days to expiry.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-logs',
    popover: {
      title: 'Agent Logs',
      description: 'A complete trace of every tool the agent called in each run. See exactly what it checked, what it found, and what it decided to do next.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-orders',
    popover: {
      title: 'Purchase Orders',
      description: 'Draft purchase orders created by the agent after each run. When stock is critically low, Polaris raises an order automatically — you just hit <strong style="color:#10b981">Approve</strong> to execute it. The amber badge shows how many are waiting for your sign-off.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-decisions',
    popover: {
      title: 'Decisions',
      description: 'An audit trail of every significant choice the agent made: which supplier it picked, why it skipped a reorder, or when it escalated an alert. Full accountability for every autonomous action.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-monitor',
    popover: {
      title: 'Monitor',
      description: 'Run health over time. See success and failure rates, tool call volumes, and how the agent is trending week on week.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-putaway',
    popover: {
      title: 'Put Away',
      description: 'Smart put-away guidance for incoming stock. The agent recommends the best storage zone based on expiry date, product type, and current zone capacity.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-competitors',
    popover: {
      title: 'Competitor Prices',
      description: 'Live prices scraped from PFD, Bidvest, and Harris Farm on every run. Compare your supplier costs against the market and spot where you are overpaying.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-nav-memory',
    popover: {
      title: 'Agent Memory',
      description: 'What Polaris has learned across every run. The agent writes observations like price trends and stock patterns here and reads them back on the next run to make smarter decisions.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-sidebar',
    popover: {
      title: 'You are all set',
      description: 'Hit <strong style="color:#58a6ff">Run Agent</strong> on the dashboard to trigger a live run now and watch it make decisions in real time. Or check back tomorrow morning after the 5am scheduled run. Everything updates automatically.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
]

function startTour() {
  let driverObj: ReturnType<typeof driver>

  const onHighlighted = () => {
    // Skip button — inject into every step footer
    const footer = document.querySelector('.polaris-tour .driver-popover-footer')
    if (footer && !footer.querySelector('.polaris-skip-btn')) {
      const btn = document.createElement('button')
      btn.textContent = 'Skip tour'
      btn.className = 'polaris-skip-btn'
      btn.addEventListener('click', () => driverObj.destroy())
      footer.appendChild(btn)
    }

    // Email iframe — inject only on step 0
    if (driverObj.getActiveIndex() === 0) {
      const mount = document.querySelector('.polaris-tour .tour-email-iframe-mount')
      if (mount && !mount.querySelector('iframe')) {
        const iframe = document.createElement('iframe')
        iframe.setAttribute('sandbox', 'allow-same-origin')
        iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;'
        iframe.srcdoc = DEMO_EMAIL_HTML
        mount.appendChild(iframe)
      }
    }
  }

  driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done',
    progressText: '{{current}} of {{total}}',
    overlayColor: '#000',
    overlayOpacity: 0.72,
    stagePadding: 6,
    stageRadius: 8,
    smoothScroll: true,
    animate: true,
    allowClose: true,
    allowKeyboardControl: true,
    popoverClass: 'polaris-tour',
    steps,
    onHighlighted,
    onDestroyed: () => {
      localStorage.setItem(TOUR_KEY, '1')
    },
  })
  driverObj.drive()
}

export function DemoTour() {
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY)
    if (!seen) {
      const t = setTimeout(startTour, 900)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <button
      onClick={startTour}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3.5 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[12px] font-medium rounded-full shadow-lg transition-colors select-none"
    >
      <BookOpen size={13} />
      Take a tour
    </button>
  )
}

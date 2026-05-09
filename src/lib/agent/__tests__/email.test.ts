import { describe, it, expect, vi } from 'vitest'

// Mock Resend before importing email.ts — the module instantiates it at load time
vi.mock('resend', () => {
  class Resend {
    emails = { send: vi.fn().mockResolvedValue({ data: null, error: null }) }
  }
  return { Resend }
})

import { buildEmailHtml } from '../email'
import type { AgentReport } from '@/types'

function baseReport(overrides: Partial<AgentReport> = {}): AgentReport {
  return {
    generated_at: '2026-05-09T06:00:00.000Z',
    summary: 'All systems nominal.',
    expiry_alerts: [],
    low_stock_alerts: [],
    reorder_recommendations: [],
    supplier_prices: [],
    website_prices: [],
    margin_alerts: [],
    ...overrides,
  }
}

describe('buildEmailHtml', () => {
  it('renders without purchase_orders field (undefined)', () => {
    const html = buildEmailHtml(baseReport())
    expect(html).toContain('Polaris Daily Brief')
    expect(html).not.toContain('Draft Purchase Orders')
    expect(html).not.toContain('orders pending')
  })

  it('renders without purchase_orders when array is empty', () => {
    const html = buildEmailHtml(baseReport({ purchase_orders: [] }))
    expect(html).not.toContain('Draft Purchase Orders')
    expect(html).not.toContain('orders pending')
  })

  it('renders Draft Purchase Orders section when POs exist', () => {
    const html = buildEmailHtml(baseReport({
      purchase_orders: [
        {
          id: 'po-1',
          product_name: 'Atlantic Salmon',
          qty: 50,
          unit: 'kg',
          supplier: 'PFD Food Services',
          price_per_unit_aud: 12.5,
          agent_reason: 'Low stock detected',
          approve_token: 'tok_abc123',
          status: 'draft',
          created_at: '2026-05-09T05:00:00.000Z',
        },
      ],
    }))
    expect(html).toContain('Draft Purchase Orders')
    expect(html).toContain('1 awaiting approval')
    expect(html).toContain('Atlantic Salmon')
    expect(html).toContain('PFD Food Services')
    expect(html).toContain('$625.00') // 12.5 * 50
    expect(html).toContain('tok_abc123')
    expect(html).toContain('Approve')
    expect(html).toContain('1 orders pending')
  })

  it('renders correct total cost for PO with price_per_unit_aud', () => {
    const html = buildEmailHtml(baseReport({
      purchase_orders: [
        {
          id: 'po-2',
          product_name: 'Barramundi',
          qty: 20,
          unit: 'kg',
          supplier: 'Harris Farm',
          price_per_unit_aud: 18.0,
          agent_reason: 'Reorder needed',
          approve_token: 'tok_xyz',
          status: 'draft',
          created_at: '2026-05-09T05:00:00.000Z',
        },
      ],
    }))
    expect(html).toContain('$360.00') // 18.0 * 20
  })

  it('renders em-dash when price_per_unit_aud is null', () => {
    const html = buildEmailHtml(baseReport({
      purchase_orders: [
        {
          id: 'po-3',
          product_name: 'Snapper',
          qty: 10,
          unit: 'kg',
          supplier: 'Bidvest',
          price_per_unit_aud: null,
          agent_reason: 'Reorder needed',
          approve_token: 'tok_noprice',
          status: 'draft',
          created_at: '2026-05-09T05:00:00.000Z',
        },
      ],
    }))
    expect(html).toContain('—')
    expect(html).not.toContain('$NaN')
  })

  it('escapes XSS in product_name and supplier', () => {
    const html = buildEmailHtml(baseReport({
      purchase_orders: [
        {
          id: 'po-xss',
          product_name: '<script>alert(1)</script>',
          qty: 1,
          unit: 'kg',
          supplier: '"Evil & Co"',
          price_per_unit_aud: null,
          agent_reason: 'test',
          approve_token: 'tok_safe',
          status: 'draft',
          created_at: '2026-05-09T05:00:00.000Z',
        },
      ],
    }))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;Evil &amp; Co&quot;')
  })

  it('PO section appears after reorder section and before margin section', () => {
    const html = buildEmailHtml(baseReport({
      reorder_recommendations: [
        { product_name: 'Tuna', product_id: 'p1', supplier: 'PFD', recommended_qty: 10, estimated_cost_aud: 100, reason: 'low' },
      ],
      purchase_orders: [
        {
          id: 'po-order',
          product_name: 'Salmon',
          qty: 5,
          unit: 'kg',
          supplier: 'PFD',
          price_per_unit_aud: 10,
          agent_reason: 'reorder',
          approve_token: 'tok_order',
          status: 'draft',
          created_at: '2026-05-09T05:00:00.000Z',
        },
      ],
      margin_alerts: [
        { product_name: 'Trout', retail_price_aud: 30, cost_price_aud: 20, margin_pct: 33.3, unit: 'kg', status: 'healthy', note: '' },
      ],
    }))
    const reorderIdx = html.indexOf('Reorder Plan')
    const poIdx = html.indexOf('Draft Purchase Orders')
    const marginIdx = html.indexOf('Margin Intelligence')
    expect(reorderIdx).toBeGreaterThan(-1)
    expect(poIdx).toBeGreaterThan(reorderIdx)
    expect(marginIdx).toBeGreaterThan(poIdx)
  })

  it('stat chip count matches purchase_orders array length', () => {
    const html = buildEmailHtml(baseReport({
      purchase_orders: [
        { id: 'a', product_name: 'A', qty: 1, unit: 'kg', supplier: 'S', price_per_unit_aud: 5, agent_reason: '', approve_token: 't1', status: 'draft', created_at: '' },
        { id: 'b', product_name: 'B', qty: 2, unit: 'kg', supplier: 'S', price_per_unit_aud: 5, agent_reason: '', approve_token: 't2', status: 'draft', created_at: '' },
        { id: 'c', product_name: 'C', qty: 3, unit: 'kg', supplier: 'S', price_per_unit_aud: 5, agent_reason: '', approve_token: 't3', status: 'draft', created_at: '' },
      ],
    }))
    expect(html).toContain('3 orders pending')
    expect(html).toContain('3 awaiting approval')
  })
})

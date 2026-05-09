import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PurchaseOrderSummary } from '@/types'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that reference them
// ---------------------------------------------------------------------------
const { mockSql, mockRunAgentLoop, mockReasonWithHermes, mockSendDailyEmail, mockBuildEmailHtml } =
  vi.hoisted(() => ({
    mockSql: vi.fn(),
    mockRunAgentLoop: vi.fn(),
    mockReasonWithHermes: vi.fn(),
    mockSendDailyEmail: vi.fn(),
    mockBuildEmailHtml: vi.fn(),
  }))

vi.mock('@/lib/db', () => ({ sql: mockSql }))
vi.mock('@/lib/agent/engine/loop', () => ({ runAgentLoop: mockRunAgentLoop }))
vi.mock('@/lib/agent/reason', () => ({ reasonWithHermes: mockReasonWithHermes }))
vi.mock('@/lib/agent/email', () => ({
  sendDailyEmail: mockSendDailyEmail,
  buildEmailHtml: mockBuildEmailHtml,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const VALID_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const RUN_UUID = '11111111-2222-3333-4444-555555555555'

function makeRequest(stream = false) {
  const url = `http://localhost/api/agent/run${stream ? '?stream=true' : ''}`
  return new Request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer test-secret` },
  }) as unknown as import('next/server').NextRequest
}

const minimalReport = {
  generated_at: '2026-05-09T00:00:00Z',
  expiry_alerts: [],
  low_stock_alerts: [],
  reorder_recommendations: [],
  supplier_prices: [],
  website_prices: [],
  margin_alerts: [],
  summary: 'All good.',
}

const loopResult = {
  flagged: [],
  allInventory: [],
  supplierPrices: [],
  websitePrices: [],
  toolTrace: [],
  reasoningBlocks: [],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/agent/run — purchase_orders in extendedReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('AGENT_SECRET', 'test-secret')

    // createRunRow → INSERT agent_runs
    mockSql.mockResolvedValueOnce([{ id: RUN_UUID }])
    // runAgentLoop
    mockRunAgentLoop.mockResolvedValue(loopResult)
    // reasonWithHermes
    mockReasonWithHermes.mockResolvedValue(minimalReport)
    // buildEmailHtml (no items flagged, so sendDailyEmail won't be called)
    mockBuildEmailHtml.mockReturnValue('<html>preview</html>')
  })

  it('maps draft PO rows from the DB into purchase_orders on extendedReport (non-streaming)', async () => {
    const draftPo = {
      id: VALID_UUID,
      approve_token: 'tok-abc',
      qty: '5',
      supplier: 'pfdfoodservice.com.au',
      price_per_unit_aud: '12.50',
      agent_reason: 'Low stock',
      status: 'draft',
      created_at: '2026-05-09T01:00:00Z',
      product_name: 'Atlantic Salmon',
      unit: 'kg',
    }

    // PO query result
    mockSql.mockResolvedValueOnce([draftPo])
    // UPDATE agent_runs SET status = 'success'
    mockSql.mockResolvedValueOnce([])

    const { POST } = await import('../route')
    const res = await POST(makeRequest(false))
    expect(res.status).toBe(200)

    // Verify the UPDATE call included purchase_orders in report_json
    const updateCall = mockSql.mock.calls.find((args) => {
      const str = String(args[0]?.[0] ?? '')
      return str.includes('UPDATE') && str.includes('agent_runs')
    })
    expect(updateCall).toBeDefined()
    const reportJsonArg = updateCall?.find(
      (arg: unknown) => typeof arg === 'string' && arg.includes('purchase_orders'),
    )
    expect(reportJsonArg).toBeDefined()

    const parsed = JSON.parse(reportJsonArg as string) as { purchase_orders: PurchaseOrderSummary[] }
    expect(parsed.purchase_orders).toHaveLength(1)
    expect(parsed.purchase_orders[0]).toMatchObject({
      id: VALID_UUID,
      product_name: 'Atlantic Salmon',
      qty: 5,
      unit: 'kg',
      supplier: 'pfdfoodservice.com.au',
      price_per_unit_aud: 12.5,
      agent_reason: 'Low stock',
      approve_token: 'tok-abc',
      status: 'draft',
    })
  })

  it('produces an empty purchase_orders array when no draft POs exist (non-streaming)', async () => {
    // PO query returns empty
    mockSql.mockResolvedValueOnce([])
    // UPDATE agent_runs
    mockSql.mockResolvedValueOnce([])

    const { POST } = await import('../route')
    const res = await POST(makeRequest(false))
    expect(res.status).toBe(200)

    const updateCall = mockSql.mock.calls.find((args) => {
      const str = String(args[0]?.[0] ?? '')
      return str.includes('UPDATE') && str.includes('agent_runs')
    })
    const reportJsonArg = updateCall?.find(
      (arg: unknown) => typeof arg === 'string' && arg.includes('purchase_orders'),
    )
    expect(reportJsonArg).toBeDefined()
    const parsed = JSON.parse(reportJsonArg as string) as { purchase_orders: PurchaseOrderSummary[] }
    expect(parsed.purchase_orders).toEqual([])
  })

  it('handles null price_per_unit_aud gracefully', async () => {
    const draftPo = {
      id: VALID_UUID,
      approve_token: 'tok-xyz',
      qty: '3',
      supplier: 'bidvest.com.au',
      price_per_unit_aud: null,
      agent_reason: 'Expiry risk',
      status: 'draft',
      created_at: '2026-05-09T02:00:00Z',
      product_name: 'Barramundi',
      unit: 'kg',
    }

    mockSql.mockResolvedValueOnce([draftPo])
    mockSql.mockResolvedValueOnce([])

    const { POST } = await import('../route')
    const res = await POST(makeRequest(false))
    expect(res.status).toBe(200)

    const updateCall = mockSql.mock.calls.find((args) => {
      const str = String(args[0]?.[0] ?? '')
      return str.includes('UPDATE') && str.includes('agent_runs')
    })
    const reportJsonArg = updateCall?.find(
      (arg: unknown) => typeof arg === 'string' && arg.includes('purchase_orders'),
    )
    const parsed = JSON.parse(reportJsonArg as string) as { purchase_orders: PurchaseOrderSummary[] }
    expect(parsed.purchase_orders[0].price_per_unit_aud).toBeNull()
  })
})

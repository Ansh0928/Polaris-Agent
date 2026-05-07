import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }))

vi.mock('@/lib/agent/snapshot', () => ({ snapshotInventory: vi.fn() }))
vi.mock('@/lib/agent/flag', () => ({ flagItems: vi.fn() }))
vi.mock('@/lib/agent/supplier', () => ({ fetchSupplierPrices: vi.fn() }))
vi.mock('@/lib/agent/website', () => ({ fetchWebsitePrices: vi.fn() }))
vi.mock('@/lib/agent/competitor', () => ({ fetchCompetitorPrices: vi.fn() }))
vi.mock('../memory', () => ({ writeMemory: vi.fn(), readMemory: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: mockSql }))

import { executeTool } from '../tools'

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('executeTool — create_purchase_order', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a non-UUID product_id', async () => {
    const result = JSON.parse(
      await executeTool('create_purchase_order', {
        product_id: '12345',
        supplier: 'pfdfoodservice.com.au',
        qty: 10,
        reason: 'Low stock',
      }),
    )
    expect(result.error).toMatch(/product_id must be a valid UUID/)
    expect(result.error).toMatch(/check_inventory/)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('rejects an empty product_id', async () => {
    const result = JSON.parse(
      await executeTool('create_purchase_order', {
        product_id: '',
        supplier: 'pfdfoodservice.com.au',
        qty: 10,
        reason: 'Low stock',
      }),
    )
    expect(result.error).toMatch(/product_id must be a valid UUID/)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('rejects missing supplier', async () => {
    const result = JSON.parse(
      await executeTool('create_purchase_order', {
        product_id: VALID_UUID,
        supplier: '',
        qty: 10,
        reason: 'Low stock',
      }),
    )
    expect(result.error).toMatch(/supplier and qty > 0 are required/)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('rejects qty of zero', async () => {
    const result = JSON.parse(
      await executeTool('create_purchase_order', {
        product_id: VALID_UUID,
        supplier: 'pfdfoodservice.com.au',
        qty: 0,
        reason: 'Low stock',
      }),
    )
    expect(result.error).toMatch(/supplier and qty > 0 are required/)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('proceeds to DB insert with a valid UUID, supplier, and qty', async () => {
    const fakeOrderId = 'order-uuid-001'
    const fakeToken = 'approve-token-xyz'
    mockSql.mockResolvedValueOnce([{ id: fakeOrderId, approve_token: fakeToken }])

    const result = JSON.parse(
      await executeTool('create_purchase_order', {
        product_id: VALID_UUID,
        supplier: 'pfdfoodservice.com.au',
        qty: 5,
        reason: 'Reorder threshold reached',
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.order_id).toBe(fakeOrderId)
    expect(result.approve_token).toBe(fakeToken)
    expect(mockSql).toHaveBeenCalledOnce()
  })
})

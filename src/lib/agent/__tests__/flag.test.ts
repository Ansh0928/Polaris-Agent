import { describe, it, expect } from 'vitest'
import { flagItems } from '../flag'
import type { InventoryWithProduct } from '@/types'

function makeItem(opts: { days_to_expiry: number; quantity: number; reorder_threshold: number }): InventoryWithProduct {
  return {
    id: 'inv-1',
    quantity: opts.quantity,
    location: 'A1',
    expiry_date: new Date().toISOString(),
    days_to_expiry: opts.days_to_expiry,
    product: {
      id: 'prod-1',
      name: 'Salmon',
      category: 'seafood',
      unit: 'kg',
      reorder_threshold: opts.reorder_threshold,
      cost_price_aud: 38,
    },
  } as unknown as InventoryWithProduct
}

describe('flagItems', () => {
  it('flags item expiring within 7 days', () => {
    const item = makeItem({ days_to_expiry: 3, quantity: 50, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result).toHaveLength(1)
    expect(result[0].reason).toBe('expiry')
  })

  it('flags item at exactly 7 days to expiry', () => {
    const item = makeItem({ days_to_expiry: 7, quantity: 50, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result[0].reason).toBe('expiry')
  })

  it('does not flag item with 8 days to expiry and adequate stock', () => {
    const item = makeItem({ days_to_expiry: 8, quantity: 50, reorder_threshold: 10 })
    expect(flagItems([item])).toHaveLength(0)
  })

  it('flags item at or below reorder threshold', () => {
    const item = makeItem({ days_to_expiry: 30, quantity: 10, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result[0].reason).toBe('low_stock')
  })

  it('flags both when expiring and low stock', () => {
    const item = makeItem({ days_to_expiry: 1, quantity: 5, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result[0].reason).toBe('both')
  })

  it('handles days_to_expiry of 0 (today)', () => {
    const item = makeItem({ days_to_expiry: 0, quantity: 100, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result[0].reason).toBe('expiry')
  })

  it('handles negative days_to_expiry (already expired)', () => {
    const item = makeItem({ days_to_expiry: -2, quantity: 100, reorder_threshold: 10 })
    const result = flagItems([item])
    expect(result[0].reason).toBe('expiry')
  })

  it('returns empty array when no items need flagging', () => {
    const item = makeItem({ days_to_expiry: 30, quantity: 100, reorder_threshold: 10 })
    expect(flagItems([item])).toHaveLength(0)
  })

  it('processes multiple items correctly', () => {
    const items = [
      makeItem({ days_to_expiry: 2, quantity: 50, reorder_threshold: 10 }),
      makeItem({ days_to_expiry: 30, quantity: 100, reorder_threshold: 10 }),
      makeItem({ days_to_expiry: 30, quantity: 5, reorder_threshold: 10 }),
    ]
    const result = flagItems(items)
    expect(result).toHaveLength(2)
  })
})

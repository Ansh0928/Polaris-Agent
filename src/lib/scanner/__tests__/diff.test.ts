import { describe, it, expect } from 'vitest'
import { computeChange } from '../diff'

describe('computeChange', () => {
  it('returns not-scanned when previous is null', () => {
    const result = computeChange(5, null)
    expect(result.status).toBe('not-scanned')
    expect(result.diff).toBeNull()
    expect(result.label).toBe('New baseline')
  })

  it('returns no-change when counts are equal', () => {
    const result = computeChange(8, 8)
    expect(result.status).toBe('no-change')
    expect(result.diff).toBe(0)
    expect(result.label).toBe('No change')
  })

  it('returns changed with negative diff when items removed', () => {
    const result = computeChange(3, 6)
    expect(result.status).toBe('changed')
    expect(result.diff).toBe(-3)
    expect(result.label).toBe('▼ 3 fewer items')
  })

  it('returns changed with positive diff when items added', () => {
    const result = computeChange(9, 6)
    expect(result.status).toBe('changed')
    expect(result.diff).toBe(3)
    expect(result.label).toBe('▲ 3 more items')
  })

  it('handles zero previous count', () => {
    const result = computeChange(4, 0)
    expect(result.status).toBe('changed')
    expect(result.diff).toBe(4)
  })
})

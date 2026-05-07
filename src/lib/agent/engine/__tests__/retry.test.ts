import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../retry'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, 3, 0)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries and succeeds on third attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')
    const result = await withRetry(fn, 3, 0)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(withRetry(fn, 3, 0)).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('respects custom maxAttempts of 1 (no retries)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(withRetry(fn, 1, 0)).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws the last error, not the first', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first error'))
      .mockRejectedValueOnce(new Error('last error'))
    await expect(withRetry(fn, 2, 0)).rejects.toThrow('last error')
  })
})

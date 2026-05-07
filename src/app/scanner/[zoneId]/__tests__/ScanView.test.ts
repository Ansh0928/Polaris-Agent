import { describe, it, expect } from 'vitest'
import { computeChange } from '@/lib/scanner/diff'

/**
 * Unit tests for the logic used by ScanView.
 *
 * ScanView itself is a browser-only client component (camera, canvas, MediaStream)
 * and cannot be rendered in jsdom without extensive mocking. These tests verify the
 * pure business-logic layer that ScanView depends on — specifically the change-label
 * calculations it renders in the status badge — matching the exact conditional
 * rendering branches in the component.
 */

describe('ScanView status badge logic (via computeChange)', () => {
  it('shows no label when lastCount is null (first scan)', () => {
    const result = computeChange(5, null)
    expect(result.status).toBe('not-scanned')
    expect(result.label).toBe('New baseline')
  })

  it('shows slate label when count unchanged', () => {
    const result = computeChange(10, 10)
    expect(result.status).toBe('no-change')
    // ScanView applies text-slate-400 for this status
    expect(result.label).toBe('No change')
  })

  it('shows yellow label with decrease when items removed', () => {
    const result = computeChange(4, 10)
    expect(result.status).toBe('changed')
    // ScanView applies text-yellow-400 for changed status
    expect(result.label).toBe('▼ 6 fewer items')
  })

  it('shows yellow label with increase when items added', () => {
    const result = computeChange(15, 10)
    expect(result.status).toBe('changed')
    expect(result.label).toBe('▲ 5 more items')
  })

  it('handles live count of zero (initial state before first detection)', () => {
    const result = computeChange(0, 10)
    expect(result.status).toBe('changed')
    expect(result.diff).toBe(-10)
  })

  it('handles lastCount of zero (zone was empty on last scan)', () => {
    const result = computeChange(3, 0)
    expect(result.status).toBe('changed')
    expect(result.diff).toBe(3)
    expect(result.label).toBe('▲ 3 more items')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — declare mockSql with vi.hoisted so the factory can reference it
const mockSql = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ sql: mockSql }))

import {
  getZones,
  getZone,
  createZone,
  getLatestTwoScans,
  createScan,
} from '../db'
import type { Zone, Scan } from '../types'

const zone1: Zone = { id: 'z1', name: 'Freezer A', description: null, created_at: '2025-01-01T00:00:00Z' }
const scan1: Scan = { id: 's1', zone_id: 'z1', item_count: 10, scanned_at: '2025-01-02T00:00:00Z' }
const scan2: Scan = { id: 's2', zone_id: 'z1', item_count: 8,  scanned_at: '2025-01-01T00:00:00Z' }

// sql is used as a tagged template literal — every call must return a thenable array
function sqlReturns(value: unknown[]) {
  mockSql.mockImplementation(() => Promise.resolve(value))
}

beforeEach(() => vi.clearAllMocks())

// --- getZone ---

describe('getZone', () => {
  it('returns the zone when found', async () => {
    sqlReturns([zone1])
    const result = await getZone('z1')
    expect(result).toEqual(zone1)
  })

  it('returns null when not found', async () => {
    sqlReturns([])
    const result = await getZone('missing')
    expect(result).toBeNull()
  })
})

// --- createZone ---

describe('createZone', () => {
  it('returns the inserted zone', async () => {
    sqlReturns([zone1])
    const result = await createZone('Freezer A', null)
    expect(result).toEqual(zone1)
  })
})

// --- getLatestTwoScans ---

describe('getLatestTwoScans', () => {
  it('returns up to two scans', async () => {
    sqlReturns([scan1, scan2])
    const result = await getLatestTwoScans('z1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('s1')
  })

  it('returns empty array when no scans', async () => {
    sqlReturns([])
    const result = await getLatestTwoScans('z1')
    expect(result).toEqual([])
  })
})

// --- getZones (status logic) ---

describe('getZones', () => {
  it('returns not-scanned status when zone has no scans', async () => {
    // first call: zones list; second call: scans for z1
    mockSql
      .mockImplementationOnce(() => Promise.resolve([zone1]))
      .mockImplementationOnce(() => Promise.resolve([]))

    const [result] = await getZones()
    expect(result.status).toBe('not-scanned')
    expect(result.lastScan).toBeNull()
    expect(result.previousScan).toBeNull()
  })

  it('returns no-change status when zone has exactly one scan', async () => {
    mockSql
      .mockImplementationOnce(() => Promise.resolve([zone1]))
      .mockImplementationOnce(() => Promise.resolve([scan1]))

    const [result] = await getZones()
    expect(result.status).toBe('no-change')
    expect(result.lastScan).toEqual(scan1)
    expect(result.previousScan).toBeNull()
  })

  it('returns no-change when two scans have equal item_count', async () => {
    const scanSameCount: Scan = { ...scan2, item_count: 10 }
    mockSql
      .mockImplementationOnce(() => Promise.resolve([zone1]))
      .mockImplementationOnce(() => Promise.resolve([scan1, scanSameCount]))

    const [result] = await getZones()
    expect(result.status).toBe('no-change')
  })

  it('returns changed when two scans have different item_count', async () => {
    mockSql
      .mockImplementationOnce(() => Promise.resolve([zone1]))
      .mockImplementationOnce(() => Promise.resolve([scan1, scan2]))

    const [result] = await getZones()
    expect(result.status).toBe('changed')
  })
})

// --- createScan ---

describe('createScan', () => {
  it('inserts the scan and returns it', async () => {
    // first call: INSERT scan; subsequent calls: INSERT detections
    mockSql
      .mockImplementationOnce(() => Promise.resolve([scan1]))
      .mockImplementation(() => Promise.resolve([]))

    const result = await createScan('z1', 10, [
      { class: 'bottle', confidence: 0.9, bbox: { x: 10, y: 20, w: 30, h: 40 } },
    ])
    expect(result).toEqual(scan1)
    // sql called twice: once for scan insert, once for detection insert
    expect(mockSql).toHaveBeenCalledTimes(2)
  })

  it('inserts scan with no detections without error', async () => {
    mockSql.mockImplementationOnce(() => Promise.resolve([scan1]))

    const result = await createScan('z1', 10, [])
    expect(result).toEqual(scan1)
    expect(mockSql).toHaveBeenCalledTimes(1)
  })
})

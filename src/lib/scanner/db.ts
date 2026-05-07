import { sql } from '@/lib/db'
import type { Zone, Scan, ZoneWithStatus } from './types'

export async function getZones(): Promise<ZoneWithStatus[]> {
  const zones = (await sql`SELECT * FROM zones ORDER BY created_at DESC`) as Zone[]
  const result: ZoneWithStatus[] = []

  for (const zone of zones) {
    const scans = (await sql`
      SELECT id, zone_id, item_count, scanned_at::text AS scanned_at
      FROM scans WHERE zone_id = ${zone.id}
      ORDER BY scanned_at DESC LIMIT 2
    `) as Scan[]
    const lastScan = scans[0] ?? null
    const previousScan = scans[1] ?? null

    let status: ZoneWithStatus['status'] = 'not-scanned'
    if (lastScan && previousScan) {
      status = lastScan.item_count === previousScan.item_count ? 'no-change' : 'changed'
    } else if (lastScan) {
      status = 'no-change'
    }

    result.push({ ...zone, lastScan, previousScan, status })
  }
  return result
}

export async function getZone(id: string): Promise<Zone | null> {
  const rows = (await sql`SELECT * FROM zones WHERE id = ${id}`) as Zone[]
  return rows[0] ?? null
}

export async function createZone(name: string, description: string | null): Promise<Zone> {
  const rows = (await sql`
    INSERT INTO zones (name, description) VALUES (${name}, ${description}) RETURNING *
  `) as Zone[]
  return rows[0]
}

export async function getLatestTwoScans(zoneId: string): Promise<Scan[]> {
  return (await sql`
    SELECT id, zone_id, item_count, scanned_at::text AS scanned_at
    FROM scans WHERE zone_id = ${zoneId}
    ORDER BY scanned_at DESC LIMIT 2
  `) as Scan[]
}

export async function createScan(
  zoneId: string,
  itemCount: number,
  detections: Array<{ class: string; confidence: number; bbox: { x: number; y: number; w: number; h: number } }>
): Promise<Scan> {
  const rows = (await sql`
    INSERT INTO scans (zone_id, item_count) VALUES (${zoneId}, ${itemCount}) RETURNING *
  `) as Scan[]
  const scan = rows[0]
  for (const det of detections) {
    await sql`
      INSERT INTO detections (scan_id, class_name, confidence, bbox)
      VALUES (${scan.id}, ${det.class}, ${det.confidence}, ${JSON.stringify(det.bbox)})
    `
  }
  return scan
}

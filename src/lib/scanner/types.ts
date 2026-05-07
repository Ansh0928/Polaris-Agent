export interface Zone {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Scan {
  id: string
  zone_id: string
  item_count: number
  scanned_at: string
}

export interface Detection {
  id: string
  scan_id: string
  class_name: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
}

export interface DetectResponse {
  count: number
  objects: Array<{
    class: string
    confidence: number
    bbox: { x: number; y: number; w: number; h: number }
  }>
}

export interface ZoneWithStatus extends Zone {
  lastScan: Scan | null
  previousScan: Scan | null
  status: 'no-change' | 'changed' | 'not-scanned'
}

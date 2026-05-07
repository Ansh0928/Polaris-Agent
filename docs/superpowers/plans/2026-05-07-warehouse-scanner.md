# Warehouse Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/scanner` section to Polaris where a phone camera streams frames to a YOLOv8 FastAPI service, detects items per warehouse zone, saves snapshots to Neon DB, and flags count changes between scans.

**Architecture:** Next.js frontend (Vercel) calls a Python FastAPI vision service (Railway) that runs YOLOv8n inference. Results are saved to 3 new Neon tables (zones, scans, detections). A pure diff function computes change status between the two most recent scans per zone.

**Tech Stack:** Next.js 15 App Router · Python 3.11 + FastAPI + ultralytics YOLOv8n · Neon via `@neondatabase/serverless` · Vitest · Pytest · Railway (vision service) · Vercel (frontend)

---

## File Map

**New files:**
- `migrations/006_scanner.sql` — zones, scans, detections tables
- `vision-api/main.py` — FastAPI + YOLOv8n `/detect` endpoint
- `vision-api/requirements.txt`
- `vision-api/Dockerfile`
- `vision-api/test_main.py` — pytest tests
- `src/lib/scanner/types.ts` — Scanner TypeScript types
- `src/lib/scanner/diff.ts` — pure change detection logic (testable)
- `src/lib/scanner/db.ts` — Neon DB queries for scanner
- `src/app/api/scanner/zones/route.ts` — GET all zones, POST create zone
- `src/app/api/scanner/zones/[zoneId]/route.ts` — GET single zone
- `src/app/api/scanner/scans/route.ts` — POST save snapshot
- `src/app/api/scanner/scans/[zoneId]/route.ts` — GET two most recent scans for zone
- `src/app/api/scanner/detect/route.ts` — proxy JPEG frame to Python FastAPI
- `src/app/scanner/page.tsx` — zone list with change status badges
- `src/app/scanner/zones/new/page.tsx` — add zone form
- `src/app/scanner/[zoneId]/page.tsx` — server wrapper, fetches zone + last scan
- `src/app/scanner/[zoneId]/ScanView.tsx` — client component, camera + YOLO overlay
- `src/lib/scanner/__tests__/diff.test.ts` — vitest unit tests

**Modified files:**
- `src/components/Sidebar.tsx` — add Scanner nav link

---

## Task 1: DB Migration

**Files:**
- Create: `migrations/006_scanner.sql`

- [ ] **Step 1: Write migration**

```sql
-- migrations/006_scanner.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  item_count INT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  bbox JSONB NOT NULL
);

CREATE INDEX idx_scans_zone_id ON scans(zone_id);
CREATE INDEX idx_detections_scan_id ON detections(scan_id);
```

- [ ] **Step 2: Apply migration to Neon**

```bash
# From polaris/ directory
bun run -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
const migration = fs.readFileSync('migrations/006_scanner.sql', 'utf8');
sql.unsafe(migration).then(() => console.log('Migration applied')).catch(console.error);
"
```

Or apply directly via the Neon console SQL editor if the script approach has issues.

- [ ] **Step 3: Verify tables exist**

```bash
bun run -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('zones','scans','detections')\`
  .then(rows => console.log('Tables:', rows.map(r => r.table_name)))
  .catch(console.error);
"
```

Expected: `Tables: [ 'zones', 'scans', 'detections' ]`

- [ ] **Step 4: Commit**

```bash
git add migrations/006_scanner.sql
git commit -m "feat(scanner): add zones, scans, detections tables"
```

---

## Task 2: Scanner Types

**Files:**
- Create: `src/lib/scanner/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/lib/scanner/types.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scanner/types.ts
git commit -m "feat(scanner): scanner TypeScript types"
```

---

## Task 3: Diff Logic + Tests

**Files:**
- Create: `src/lib/scanner/diff.ts`
- Create: `src/lib/scanner/__tests__/diff.test.ts`

- [ ] **Step 1: Write the failing tests first**

```typescript
// src/lib/scanner/__tests__/diff.test.ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /Users/tasmanstar/Desktop/demo/polaris
bun run vitest src/lib/scanner/__tests__/diff.test.ts
```

Expected: `Error: Cannot find module '../diff'`

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/scanner/diff.ts
export function computeChange(
  current: number,
  previous: number | null
): { status: 'no-change' | 'changed' | 'not-scanned'; diff: number | null; label: string } {
  if (previous === null) return { status: 'not-scanned', diff: null, label: 'New baseline' }
  const diff = current - previous
  if (diff === 0) return { status: 'no-change', diff: 0, label: 'No change' }
  return {
    status: 'changed',
    diff,
    label: diff < 0 ? `▼ ${Math.abs(diff)} fewer items` : `▲ ${diff} more items`,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun run vitest src/lib/scanner/__tests__/diff.test.ts
```

Expected: `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanner/diff.ts src/lib/scanner/__tests__/diff.test.ts
git commit -m "feat(scanner): change detection diff logic + tests"
```

---

## Task 4: Scanner DB Queries

**Files:**
- Create: `src/lib/scanner/db.ts`

- [ ] **Step 1: Write db.ts**

```typescript
// src/lib/scanner/db.ts
import { sql } from '@/lib/db'
import type { Zone, Scan, Detection, ZoneWithStatus } from './types'

export async function getZones(): Promise<ZoneWithStatus[]> {
  const zones = await sql<Zone[]>`SELECT * FROM zones ORDER BY created_at DESC`
  const result: ZoneWithStatus[] = []

  for (const zone of zones) {
    const scans = await sql<Scan[]>`
      SELECT id, zone_id, item_count, scanned_at::text AS scanned_at
      FROM scans WHERE zone_id = ${zone.id}
      ORDER BY scanned_at DESC LIMIT 2
    `
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
  const rows = await sql<Zone[]>`SELECT * FROM zones WHERE id = ${id}`
  return rows[0] ?? null
}

export async function createZone(name: string, description: string | null): Promise<Zone> {
  const rows = await sql<Zone[]>`
    INSERT INTO zones (name, description) VALUES (${name}, ${description}) RETURNING *
  `
  return rows[0]
}

export async function getLatestTwoScans(zoneId: string): Promise<Scan[]> {
  return sql<Scan[]>`
    SELECT id, zone_id, item_count, scanned_at::text AS scanned_at
    FROM scans WHERE zone_id = ${zoneId}
    ORDER BY scanned_at DESC LIMIT 2
  `
}

export async function createScan(
  zoneId: string,
  itemCount: number,
  detections: Array<{ class: string; confidence: number; bbox: { x: number; y: number; w: number; h: number } }>
): Promise<Scan> {
  const rows = await sql<Scan[]>`
    INSERT INTO scans (zone_id, item_count) VALUES (${zoneId}, ${itemCount}) RETURNING *
  `
  const scan = rows[0]
  for (const det of detections) {
    await sql`
      INSERT INTO detections (scan_id, class_name, confidence, bbox)
      VALUES (${scan.id}, ${det.class}, ${det.confidence}, ${JSON.stringify(det.bbox)})
    `
  }
  return scan
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scanner/db.ts
git commit -m "feat(scanner): scanner DB query functions"
```

---

## Task 5: API Routes

**Files:**
- Create: `src/app/api/scanner/zones/route.ts`
- Create: `src/app/api/scanner/zones/[zoneId]/route.ts`
- Create: `src/app/api/scanner/scans/route.ts`
- Create: `src/app/api/scanner/scans/[zoneId]/route.ts`
- Create: `src/app/api/scanner/detect/route.ts`

- [ ] **Step 1: Write zones route (GET all, POST create)**

```typescript
// src/app/api/scanner/zones/route.ts
import { NextResponse } from 'next/server'
import { getZones, createZone } from '@/lib/scanner/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const zones = await getZones()
  return NextResponse.json(zones)
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const zone = await createZone(name.trim(), description?.trim() ?? null)
  return NextResponse.json(zone, { status: 201 })
}
```

- [ ] **Step 2: Write single zone route**

```typescript
// src/app/api/scanner/zones/[zoneId]/route.ts
import { NextResponse } from 'next/server'
import { getZone } from '@/lib/scanner/db'

export async function GET(_req: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params
  const zone = await getZone(zoneId)
  if (!zone) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(zone)
}
```

- [ ] **Step 3: Write scans route (POST save snapshot)**

```typescript
// src/app/api/scanner/scans/route.ts
import { NextResponse } from 'next/server'
import { createScan } from '@/lib/scanner/db'

export async function POST(req: Request) {
  const { zoneId, itemCount, detections } = await req.json()
  if (!zoneId || itemCount === undefined) {
    return NextResponse.json({ error: 'zoneId and itemCount required' }, { status: 400 })
  }
  const scan = await createScan(zoneId, itemCount, detections ?? [])
  return NextResponse.json(scan, { status: 201 })
}
```

- [ ] **Step 4: Write scans by zone route (GET latest two)**

```typescript
// src/app/api/scanner/scans/[zoneId]/route.ts
import { NextResponse } from 'next/server'
import { getLatestTwoScans } from '@/lib/scanner/db'

export async function GET(_req: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params
  const scans = await getLatestTwoScans(zoneId)
  return NextResponse.json(scans)
}
```

- [ ] **Step 5: Write detect proxy route**

```typescript
// src/app/api/scanner/detect/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const visionUrl = process.env.VISION_API_URL
  if (!visionUrl) return NextResponse.json({ error: 'VISION_API_URL not configured' }, { status: 503 })

  const formData = await req.formData()
  const res = await fetch(`${visionUrl}/detect`, { method: 'POST', body: formData })
  if (!res.ok) return NextResponse.json({ error: 'vision service error' }, { status: 502 })
  return NextResponse.json(await res.json())
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/scanner/
git commit -m "feat(scanner): API routes — zones, scans, detect proxy"
```

---

## Task 6: Python Vision Service

**Files:**
- Create: `vision-api/main.py`
- Create: `vision-api/requirements.txt`
- Create: `vision-api/Dockerfile`
- Create: `vision-api/test_main.py`

- [ ] **Step 1: Write test first**

```python
# vision-api/test_main.py
import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

def make_jpeg_bytes() -> bytes:
    arr = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_detect_returns_valid_shape():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "objects" in data
    assert isinstance(data["count"], int)
    assert isinstance(data["objects"], list)

def test_detect_count_matches_objects_length():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    data = response.json()
    assert data["count"] == len(data["objects"])

def test_detect_object_schema():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    data = response.json()
    for obj in data["objects"]:
        assert "class" in obj
        assert "confidence" in obj
        assert "bbox" in obj
        assert all(k in obj["bbox"] for k in ("x", "y", "w", "h"))
```

- [ ] **Step 2: Write requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.6
ultralytics==8.3.0
Pillow==10.4.0
numpy==1.26.4
python-multipart==0.0.9
httpx==0.27.0
pytest==8.3.3
```

- [ ] **Step 3: Write main.py**

```python
# vision-api/main.py
import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

app = FastAPI(title="Warehouse Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")  # downloads on first run (~6MB)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    results = model(img, verbose=False)
    objects = []
    for result in results:
        for box in result.boxes:
            xywh = box.xywh[0].tolist()
            objects.append({
                "class": result.names[int(box.cls)],
                "confidence": round(float(box.conf), 3),
                "bbox": {"x": xywh[0], "y": xywh[1], "w": xywh[2], "h": xywh[3]},
            })
    return {"count": len(objects), "objects": objects}
```

- [ ] **Step 4: Write Dockerfile**

```dockerfile
# vision-api/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 5: Run tests locally**

```bash
cd vision-api
pip install -r requirements.txt
pytest test_main.py -v
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add vision-api/
git commit -m "feat(scanner): Python FastAPI YOLOv8n vision service"
```

---

## Task 7: Scanner Pages — Zone List

**Files:**
- Create: `src/app/scanner/page.tsx`

- [ ] **Step 1: Write zone list page**

```tsx
// src/app/scanner/page.tsx
import { getZones } from '@/lib/scanner/db'
import { computeChange } from '@/lib/scanner/diff'
import Link from 'next/link'
import { Camera, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ScannerPage() {
  const zones = await getZones()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-white">Warehouse Scanner</h1>
        <Link
          href="/scanner/zones/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#1c2a47] border border-[#4f8ef7] text-[#4f8ef7] text-sm rounded-md hover:bg-[#4f8ef7] hover:text-white transition-colors"
        >
          <Plus size={15} />
          Add Zone
        </Link>
      </div>

      {zones.length === 0 && (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center text-[#484f58] text-sm">
          No zones yet. Add a zone to start scanning.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map((zone) => {
          const change = zone.lastScan
            ? computeChange(zone.lastScan.item_count, zone.previousScan?.item_count ?? null)
            : null

          const badgeStyle =
            !zone.lastScan
              ? 'bg-[#1c1c24] text-[#484f58] border-[#2d2d3a]'
              : change?.status === 'changed'
              ? 'bg-[#2d1e1e] text-[#f85149] border-[#5c2020]'
              : 'bg-[#0d2015] text-[#3fb950] border-[#1a4a2a]'

          const badgeLabel = !zone.lastScan
            ? 'Not scanned'
            : change?.status === 'changed'
            ? change.label
            : 'No change'

          return (
            <Link
              key={zone.id}
              href={`/scanner/${zone.id}`}
              className="block bg-[#0d1117] border border-[#21262d] rounded-lg p-4 hover:border-[#4f8ef7] transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#161b22] rounded-md group-hover:bg-[#1c2a47] transition-colors">
                    <Camera size={16} className="text-[#58a6ff]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-white">{zone.name}</div>
                    {zone.description && (
                      <div className="text-[12px] text-[#484f58] mt-0.5">{zone.description}</div>
                    )}
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full border font-mono shrink-0 ${badgeStyle}`}>
                  {badgeLabel}
                </span>
              </div>
              {zone.lastScan && (
                <div className="mt-3 text-[11px] text-[#484f58] font-mono">
                  Last scan: {new Date(zone.lastScan.scanned_at).toLocaleString()} ·{' '}
                  {zone.lastScan.item_count} items
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/scanner/page.tsx
git commit -m "feat(scanner): zone list page"
```

---

## Task 8: Scanner Pages — Add Zone

**Files:**
- Create: `src/app/scanner/zones/new/page.tsx`

- [ ] **Step 1: Write add zone page (server action)**

```tsx
// src/app/scanner/zones/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewZonePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Zone name is required'); return }
    setSaving(true)
    const res = await fetch('/api/scanner/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null }),
    })
    if (res.ok) {
      router.push('/scanner')
      router.refresh()
    } else {
      setError('Failed to create zone')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/scanner" className="text-[#484f58] hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-[22px] font-semibold text-white">Add Zone</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#21262d] rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-[12px] text-[#8b949e] mb-1.5">Zone Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cold Storage, Aisle 1"
            className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-[#8b949e] mb-1.5">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Back-left corner, shelves A–C"
            className="w-full bg-[#161b22] border border-[#30363d] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder-[#484f58]"
          />
        </div>
        {error && <p className="text-[#f85149] text-[12px]">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-[#238636] text-white text-sm rounded-md hover:bg-[#2ea043] transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Zone'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/scanner/zones/new/page.tsx
git commit -m "feat(scanner): add zone form page"
```

---

## Task 9: Scanner Pages — Scan View

**Files:**
- Create: `src/app/scanner/[zoneId]/page.tsx`
- Create: `src/app/scanner/[zoneId]/ScanView.tsx`

- [ ] **Step 1: Write server wrapper page**

```tsx
// src/app/scanner/[zoneId]/page.tsx
import { getZone, getLatestTwoScans } from '@/lib/scanner/db'
import { notFound } from 'next/navigation'
import { ScanView } from './ScanView'

export const dynamic = 'force-dynamic'

export default async function ZoneScanPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params
  const zone = await getZone(zoneId)
  if (!zone) notFound()

  const scans = await getLatestTwoScans(zoneId)
  const lastCount = scans[0]?.item_count ?? null

  return <ScanView zoneId={zoneId} zoneName={zone.name} lastCount={lastCount} />
}
```

- [ ] **Step 2: Write camera client component**

```tsx
// src/app/scanner/[zoneId]/ScanView.tsx
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import type { DetectResponse } from '@/lib/scanner/types'
import { computeChange } from '@/lib/scanner/diff'

interface Props {
  zoneId: string
  zoneName: string
  lastCount: number | null
}

export function ScanView({ zoneId, zoneName, lastCount }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [liveCount, setLiveCount] = useState(0)
  const [liveObjects, setLiveObjects] = useState<DetectResponse['objects']>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const detectingRef = useRef(false)

  const drawBoxes = useCallback(
    (ctx: CanvasRenderingContext2D, objects: DetectResponse['objects'], w: number, h: number) => {
      if (videoRef.current) ctx.drawImage(videoRef.current, 0, 0, w, h)
      ctx.lineWidth = 2
      ctx.font = '11px monospace'
      for (const obj of objects) {
        const { x, y, w: bw, h: bh } = obj.bbox
        const left = x - bw / 2
        const top = y - bh / 2
        ctx.strokeStyle = '#22c55e'
        ctx.strokeRect(left, top, bw, bh)
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(left, top - 16, bw, 16)
        ctx.fillStyle = '#000'
        ctx.fillText(`${obj.class} ${Math.round(obj.confidence * 100)}%`, left + 3, top - 4)
      }
    },
    []
  )

  useEffect(() => {
    let stream: MediaStream | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        })
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        intervalId = setInterval(async () => {
          if (detectingRef.current) return
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.videoWidth === 0) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(video, 0, 0)

          detectingRef.current = true
          canvas.toBlob(
            async (blob) => {
              try {
                if (!blob) return
                const fd = new FormData()
                fd.append('image', blob, 'frame.jpg')
                const res = await fetch('/api/scanner/detect', { method: 'POST', body: fd })
                if (!res.ok) return
                const data: DetectResponse = await res.json()
                setLiveCount(data.count)
                setLiveObjects(data.objects)
                drawBoxes(ctx, data.objects, canvas.width, canvas.height)
              } finally {
                detectingRef.current = false
              }
            },
            'image/jpeg',
            0.8
          )
        }, 1000)
      } catch {
        setError('Camera access denied. Allow camera permissions and reload.')
      }
    }

    startCamera()
    return () => {
      if (intervalId) clearInterval(intervalId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [drawBoxes])

  async function saveSnapshot() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/scanner/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId,
          itemCount: liveCount,
          detections: liveObjects.map((o) => ({ class: o.class, confidence: o.confidence, bbox: o.bbox })),
        }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save snapshot')
    } finally {
      setSaving(false)
    }
  }

  const change = computeChange(liveCount, lastCount)

  return (
    <div className="relative w-full bg-black" style={{ height: '100dvh' }}>
      {/* hidden video feed */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-0" />
      {/* canvas with YOLO overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link href="/scanner" className="flex items-center gap-1.5 text-white text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <span className="text-white text-sm font-medium">{zoneName}</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-xs font-mono">LIVE</span>
        </div>
      </div>

      {/* status badge */}
      {error ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm text-center max-w-xs">
          {error}
        </div>
      ) : (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm text-white whitespace-nowrap">
          Detected:{' '}
          <span className="text-green-400 font-bold">{liveCount}</span>
          {lastCount !== null && (
            <span
              className={`ml-3 ${
                change.status === 'changed' ? 'text-yellow-400' : 'text-slate-400'
              }`}
            >
              {change.label}
            </span>
          )}
        </div>
      )}

      {/* save button */}
      <button
        onClick={saveSnapshot}
        disabled={saving}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
      >
        <Save size={15} />
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Snapshot'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/scanner/
git commit -m "feat(scanner): scan view with live YOLO camera overlay"
```

---

## Task 10: Sidebar Update

**Files:**
- Modify: `src/components/Sidebar.tsx:10-18`

- [ ] **Step 1: Add Scanner to nav array**

In `src/components/Sidebar.tsx`, update the import line and nav array:

```typescript
// Change the import at line 6 from:
import {
  LayoutDashboard, Package, FileText, BarChart2,
  Inbox, Globe, Brain, Settings, Zap,
} from 'lucide-react'

// To:
import {
  LayoutDashboard, Package, FileText, BarChart2,
  Inbox, Globe, Brain, Settings, Zap, Camera,
} from 'lucide-react'
```

```typescript
// Change the nav array at line 10 from:
const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/runs', icon: FileText, label: 'Logs' },
  { href: '/monitor', icon: BarChart2, label: 'Monitor' },
  { href: '/putaway', icon: Inbox, label: 'Put Away' },
  { href: '/competitors', icon: Globe, label: 'Competitors' },
  { href: '/memory', icon: Brain, label: 'Agent Memory' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

// To:
const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/scanner', icon: Camera, label: 'Scanner' },
  { href: '/runs', icon: FileText, label: 'Logs' },
  { href: '/monitor', icon: BarChart2, label: 'Monitor' },
  { href: '/putaway', icon: Inbox, label: 'Put Away' },
  { href: '/competitors', icon: Globe, label: 'Competitors' },
  { href: '/memory', icon: Brain, label: 'Agent Memory' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(scanner): add Scanner to sidebar nav"
```

---

## Task 11: Environment Variable + Deploy

- [ ] **Step 1: Add VISION_API_URL to .env.local**

```bash
echo "VISION_API_URL=http://localhost:8000" >> .env.local
```

- [ ] **Step 2: Deploy Python service to Railway**

1. Go to https://railway.app → New Project → Deploy from GitHub repo → select `polaris` repo, set root directory to `vision-api`
2. Railway auto-detects the Dockerfile and builds it
3. Copy the generated Railway URL (e.g. `https://vision-api-production-xxxx.up.railway.app`)

- [ ] **Step 3: Set env var on Vercel**

```bash
# From polaris/ directory
bunx vercel env add VISION_API_URL production
# Paste the Railway URL when prompted
```

- [ ] **Step 4: Smoke test locally**

```bash
# Terminal 1: start vision API
cd vision-api
uvicorn main:app --reload

# Terminal 2: start Next.js
cd polaris
bun run dev
```

Open http://localhost:3000/scanner, add a zone, open scan view, verify camera starts and detection count appears.

- [ ] **Step 5: Push branch + open PR**

```bash
git push -u origin feature/warehouse-scanner
gh pr create \
  --title "feat: warehouse scanner — YOLO-powered zone stocktake" \
  --body "$(cat <<'EOF'
## Summary
- Adds /scanner section to Polaris with zone management and live YOLO camera scanning
- Python FastAPI + YOLOv8n vision service (Railway) detects items per zone
- Compares item counts between scans and flags changes
- 3 new Neon tables: zones, scans, detections

## Test plan
- [ ] Run `bun run vitest` — diff tests pass
- [ ] Run `pytest vision-api/test_main.py` — 3 tests pass
- [ ] Add a zone at /scanner/zones/new
- [ ] Open scan view, verify camera feed starts
- [ ] Verify YOLO bounding boxes appear on canvas
- [ ] Save a snapshot, revisit — verify count shows
- [ ] Change number of items in frame, save again — verify change badge appears
EOF
)"
```

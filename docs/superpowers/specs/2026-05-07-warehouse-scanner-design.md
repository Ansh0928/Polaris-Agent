# Warehouse Scanner — Design Spec
_Date: 2026-05-07_

## Overview
A mobile-first warehouse stocktake tool. Walk through the warehouse, point the phone camera at each zone, and the system uses server-side YOLOv8 to count items. On subsequent scans, it compares counts and flags any changes (items added or removed). No QR codes, no barcodes — pure computer vision.

---

## Architecture

### Components
1. **Next.js scanner pages** (`/scanner`) — added to existing Polaris app on Vercel
2. **Python FastAPI vision service** (`vision-api/`) — YOLOv8n inference, deployed on Railway
3. **Neon DB** — 3 new tables: `zones`, `scans`, `detections` (same DB as Polaris)

### Request Flow
```
Phone camera → JPEG frame (fetch POST) → FastAPI /detect → YOLOv8 inference
→ { objects: [{class, confidence, bbox}] } → Next.js API route → saves to Neon
→ compare with last scan → return change summary → display on map
```

---

## Database Schema

### `zones`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Cold Storage", "Aisle 1" |
| description | text | optional |
| created_at | timestamptz | |

### `scans`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| zone_id | uuid FK | references zones |
| item_count | int | total objects detected |
| scanned_at | timestamptz | |

### `detections`
| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| scan_id | uuid FK | references scans |
| class_name | text | YOLO class label |
| confidence | float | 0–1 |
| bbox | jsonb | {x, y, w, h} |

---

## Pages

### `/scanner` — Zone List
- Lists all zones with last scan time and status badge (No Change / Changed / Not Scanned)
- "Add Zone" button
- Tap a zone → go to scan view

### `/scanner/[zoneId]` — Scan View
- Mobile-first fullscreen camera feed
- Canvas overlay draws YOLO bounding boxes in real-time (1 frame/sec sent to server)
- Shows detected count vs last scan count
- "Save Snapshot" button — commits current frame detections to DB
- Shows diff alert if count differs from baseline

### `/scanner/zones/new` — Add Zone
- Simple form: name + description

---

## Vision API (Python FastAPI)

### Endpoint: `POST /detect`
- Accepts: `multipart/form-data` with `image` field (JPEG)
- Runs: YOLOv8n inference (pre-trained COCO weights)
- Returns:
```json
{
  "count": 3,
  "objects": [
    {"class": "bottle", "confidence": 0.94, "bbox": {"x": 120, "y": 80, "w": 60, "h": 90}},
    ...
  ]
}
```
- Deployed on Railway (hobby plan ~$5/mo)

---

## Change Detection Logic
- On "Save Snapshot": fetch previous scan for the same zone
- If no previous scan: this is the baseline — save and mark as "established"
- If previous scan exists: compare `item_count`
  - Diff = 0 → "No Change"
  - Diff < 0 → "⚠ {n} fewer items"
  - Diff > 0 → "✓ {n} more items"
- Stored as a computed field on scan save (not recalculated every read)

---

## Constraints & Decisions
- **No QR codes** — zones selected manually from dropdown before scanning
- **YOLOv8n pre-trained** for MVP — counts objects generically, not by product type
- **1 frame/sec** to server — stocktake is slow-paced, no need for higher rate
- **No offline mode** for MVP — needs internet to reach Railway
- **No photo storage in MVP** — only detection counts and bounding boxes stored; photos not persisted

---

## Out of Scope (Phase 2)
- Custom-trained model for specific product classes (salmon box, tuna crate, etc.)
- GPS or AR-based positioning
- Automated alerts / email when changes detected

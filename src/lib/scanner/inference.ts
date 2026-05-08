export const CONF_THRESHOLD = 0.25
export const IOU_THRESHOLD = 0.45
const NUM_BOXES = 8400
const NUM_CLASSES = 80

export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
  'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
  'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
  'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
  'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush',
]

/** bbox uses center-point coordinates (x,y = cx,cy), not top-left */
export interface DetectObject {
  class: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
}

export interface RawBox {
  x1: number; y1: number; x2: number; y2: number
  cx: number; cy: number; w: number; h: number
  score: number; cls: number
}

export function computeIoU(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): number {
  const xx1 = Math.max(a.x1, b.x1)
  const yy1 = Math.max(a.y1, b.y1)
  const xx2 = Math.min(a.x2, b.x2)
  const yy2 = Math.min(a.y2, b.y2)
  const inter = Math.max(0, xx2 - xx1) * Math.max(0, yy2 - yy1)
  if (inter === 0) return 0
  const aArea = (a.x2 - a.x1) * (a.y2 - a.y1)
  const bArea = (b.x2 - b.x1) * (b.y2 - b.y1)
  return inter / (aArea + bArea - inter)
}

export function nms(boxes: RawBox[], iouThreshold: number): RawBox[] {
  if (boxes.length === 0) return []
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const active = new Array(sorted.length).fill(true)
  const keep: RawBox[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (!active[i]) continue
    keep.push(sorted[i])
    for (let j = i + 1; j < sorted.length; j++) {
      if (!active[j]) continue
      if (computeIoU(sorted[i], sorted[j]) > iouThreshold) active[j] = false
    }
  }
  return keep
}

export function postprocess(
  output: Float32Array,
  scale: number,
  px: number,
  py: number
): DetectObject[] {
  const candidates: RawBox[] = []

  for (let i = 0; i < NUM_BOXES; i++) {
    let maxScore = 0
    let maxCls = 0
    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = output[(4 + c) * NUM_BOXES + i]
      if (score > maxScore) { maxScore = score; maxCls = c }
    }
    if (maxScore < CONF_THRESHOLD) continue

    const cx = output[0 * NUM_BOXES + i]
    const cy = output[1 * NUM_BOXES + i]
    const w  = output[2 * NUM_BOXES + i]
    const h  = output[3 * NUM_BOXES + i]

    candidates.push({
      cx: (cx - px) / scale,
      cy: (cy - py) / scale,
      w: w / scale,
      h: h / scale,
      x1: (cx - w / 2 - px) / scale,
      y1: (cy - h / 2 - py) / scale,
      x2: (cx + w / 2 - px) / scale,
      y2: (cy + h / 2 - py) / scale,
      score: maxScore,
      cls: maxCls,
    })
  }

  // Apply NMS per class to avoid cross-class suppression
  const byClass = new Map<number, RawBox[]>()
  for (const box of candidates) {
    const list = byClass.get(box.cls) ?? []
    list.push(box)
    byClass.set(box.cls, list)
  }

  const kept: RawBox[] = []
  for (const boxes of byClass.values()) {
    kept.push(...nms(boxes, IOU_THRESHOLD))
  }

  return kept.map((b) => ({
    class: COCO_CLASSES[b.cls] ?? String(b.cls),
    confidence: Math.round(b.score * 1000) / 1000,
    bbox: {
      x: Math.round(b.cx * 10) / 10,
      y: Math.round(b.cy * 10) / 10,
      w: Math.round(b.w * 10) / 10,
      h: Math.round(b.h * 10) / 10,
    },
  }))
}

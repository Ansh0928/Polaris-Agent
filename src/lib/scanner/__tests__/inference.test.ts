import { describe, it, expect } from 'vitest'
import { nms, computeIoU, postprocess, COCO_CLASSES } from '../inference'

describe('computeIoU', () => {
  it('returns 1 for identical boxes', () => {
    const box = { x1: 0, y1: 0, x2: 100, y2: 100 }
    expect(computeIoU(box, box)).toBeCloseTo(1.0)
  })

  it('returns 0 for non-overlapping boxes', () => {
    const a = { x1: 0, y1: 0, x2: 50, y2: 50 }
    const b = { x1: 100, y1: 100, x2: 150, y2: 150 }
    expect(computeIoU(a, b)).toBe(0)
  })

  it('returns partial overlap correctly', () => {
    const a = { x1: 0, y1: 0, x2: 100, y2: 100 }
    const b = { x1: 50, y1: 50, x2: 150, y2: 150 }
    // intersection: 50x50=2500, union: 10000+10000-2500=17500
    expect(computeIoU(a, b)).toBeCloseTo(2500 / 17500, 4)
  })
})

describe('nms', () => {
  it('keeps highest-confidence box when two overlap heavily', () => {
    const boxes = [
      { x1: 0, y1: 0, x2: 100, y2: 100, cx: 50, cy: 50, w: 100, h: 100, score: 0.7, cls: 0 },
      { x1: 10, y1: 10, x2: 110, y2: 110, cx: 60, cy: 60, w: 100, h: 100, score: 0.9, cls: 0 },
    ]
    const result = nms(boxes, 0.45)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(0.9)
  })

  it('keeps both boxes when IoU is below threshold', () => {
    const boxes = [
      { x1: 0, y1: 0, x2: 50, y2: 50, cx: 25, cy: 25, w: 50, h: 50, score: 0.9, cls: 0 },
      { x1: 200, y1: 200, x2: 250, y2: 250, cx: 225, cy: 225, w: 50, h: 50, score: 0.7, cls: 0 },
    ]
    const result = nms(boxes, 0.45)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(nms([], 0.45)).toHaveLength(0)
  })
})

describe('postprocess', () => {
  it('returns empty array when all scores below threshold', () => {
    // [84 x 8400] flat array, all zeros
    const output = new Float32Array(84 * 8400).fill(0)
    const result = postprocess(output, 1.0, 0, 0)
    expect(result).toHaveLength(0)
  })

  it('detects one object above threshold', () => {
    const NUM_BOXES = 8400
    const output = new Float32Array(84 * NUM_BOXES).fill(0)
    // Box at index 0: cx=320, cy=240, w=100, h=80
    output[0 * NUM_BOXES + 0] = 320
    output[1 * NUM_BOXES + 0] = 240
    output[2 * NUM_BOXES + 0] = 100
    output[3 * NUM_BOXES + 0] = 80
    // Class 0 ("person") score = 0.9
    output[4 * NUM_BOXES + 0] = 0.9

    const result = postprocess(output, 1.0, 0, 0)
    expect(result).toHaveLength(1)
    expect(result[0].class).toBe(COCO_CLASSES[0])
    expect(result[0].confidence).toBeCloseTo(0.9, 2)
    expect(result[0].bbox.x).toBeCloseTo(320, 1)
    expect(result[0].bbox.y).toBeCloseTo(240, 1)
  })

  it('keeps both boxes when same position but different classes', () => {
    const NUM_BOXES = 8400
    const output = new Float32Array(84 * NUM_BOXES).fill(0)
    // Box 0: class 0 (person), score 0.9
    output[0 * NUM_BOXES + 0] = 320; output[1 * NUM_BOXES + 0] = 240
    output[2 * NUM_BOXES + 0] = 100; output[3 * NUM_BOXES + 0] = 100
    output[4 * NUM_BOXES + 0] = 0.9
    // Box 1: class 1 (bicycle), same position, score 0.8
    output[0 * NUM_BOXES + 1] = 320; output[1 * NUM_BOXES + 1] = 240
    output[2 * NUM_BOXES + 1] = 100; output[3 * NUM_BOXES + 1] = 100
    output[5 * NUM_BOXES + 1] = 0.8
    const result = postprocess(output, 1.0, 0, 0)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.class)).toContain('person')
    expect(result.map(r => r.class)).toContain('bicycle')
  })
})

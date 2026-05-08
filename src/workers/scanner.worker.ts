/// <reference lib="webworker" />
import { InferenceSession, Tensor, env } from 'onnxruntime-web'
import { postprocess, type DetectObject } from '@/lib/scanner/inference'

const MODEL_URL = 'https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx'
const CACHE_NAME = 'polaris-yolov8n-v1'
const INPUT_SIZE = 640

env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/`
env.wasm.numThreads = 1

let session: InferenceSession | null = null

async function loadModel(): Promise<void> {
  self.postMessage({ type: 'status', status: 'loading' })
  try {
    const cache = await caches.open(CACHE_NAME)
    let response = await cache.match(MODEL_URL)
    if (!response) {
      response = await fetch(MODEL_URL)
      if (!response.ok) throw new Error(`Model fetch failed: ${response.status}`)
      await cache.put(MODEL_URL, response.clone())
    }
    const buffer = await response.arrayBuffer()
    session = await InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    self.postMessage({ type: 'status', status: 'ready' })
  } catch (err) {
    self.postMessage({ type: 'status', status: 'error', message: String(err) })
  }
}

function preprocess(
  pixels: Uint8ClampedArray,
  origW: number,
  origH: number
): { tensor: Float32Array; scale: number; px: number; py: number } {
  const scale = INPUT_SIZE / Math.max(origW, origH)
  const nw = Math.floor(origW * scale)
  const nh = Math.floor(origH * scale)
  const pxOff = Math.floor((INPUT_SIZE - nw) / 2)
  const pyOff = Math.floor((INPUT_SIZE - nh) / 2)

  const srcCanvas = new OffscreenCanvas(origW, origH)
  const srcCtx = srcCanvas.getContext('2d')!
  srcCtx.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer as ArrayBuffer), origW, origH), 0, 0)

  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(114,114,114)'
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE)
  ctx.drawImage(srcCanvas, pxOff, pyOff, nw, nh)

  const data = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data
  const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE)
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    tensor[i]                               = data[i * 4]     / 255.0
    tensor[INPUT_SIZE * INPUT_SIZE + i]     = data[i * 4 + 1] / 255.0
    tensor[2 * INPUT_SIZE * INPUT_SIZE + i] = data[i * 4 + 2] / 255.0
  }

  return { tensor, scale, px: pxOff, py: pyOff }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, pixels, width, height } = e.data

  if (type !== 'detect') return
  if (!session) {
    self.postMessage({ type: 'error', message: 'Model not loaded yet' })
    return
  }

  try {
    const { tensor, scale, px, py } = preprocess(
      new Uint8ClampedArray(pixels),
      width,
      height
    )
    const inputTensor = new Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE])
    const inputName = session.inputNames[0]
    const results = await session.run({ [inputName]: inputTensor })
    const outputName = session.outputNames[0]
    const outputData = results[outputName].data as Float32Array
    const objects: DetectObject[] = postprocess(outputData, scale, px, py)
    self.postMessage({ type: 'result', count: objects.length, objects })
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) })
  }
}

loadModel()

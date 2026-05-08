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

type WorkerStatus = 'loading' | 'ready' | 'error'

export function ScanView({ zoneId, zoneName, lastCount }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const detectingRef = useRef(false)
  const workerReadyRef = useRef(false)
  const [liveCount, setLiveCount] = useState(0)
  const [liveObjects, setLiveObjects] = useState<DetectResponse['objects']>([])
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('loading')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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

  // Initialise Web Worker
  useEffect(() => {
    let worker: Worker
    try {
      worker = new Worker(new URL('../../../workers/scanner.worker.ts', import.meta.url))
      workerRef.current = worker
      worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type === 'status') {
          workerReadyRef.current = msg.status === 'ready'
          setWorkerStatus(msg.status as WorkerStatus)
        } else if (msg.type === 'result') {
          setLiveCount(msg.count)
          setLiveObjects(msg.objects)
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')!
            drawBoxes(ctx, msg.objects, canvas.width, canvas.height)
          }
          detectingRef.current = false
        } else if (msg.type === 'error') {
          detectingRef.current = false
        }
      }
      worker.onerror = () => setWorkerStatus('error')
    } catch {
      setWorkerStatus('error')
    }
    return () => { workerRef.current?.terminate(); workerRef.current = null }
  }, [drawBoxes])

  // Camera + detection loop
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

        intervalId = setInterval(() => {
          if (detectingRef.current) return
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.videoWidth === 0) return

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(video, 0, 0)
          detectingRef.current = true

          if (workerRef.current && workerReadyRef.current) {
            // Browser inference path — zero-copy pixel transfer
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            workerRef.current.postMessage(
              { type: 'detect', pixels: imageData.data, width: canvas.width, height: canvas.height },
              [imageData.data.buffer]
            )
          } else {
            // Server fallback path (Render)
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
          }
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
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-0" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link href="/scanner" className="flex items-center gap-1.5 text-white text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <span className="text-white text-sm font-medium">{zoneName}</span>
        <div className="flex items-center gap-1.5">
          {workerStatus === 'loading' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-yellow-400 text-xs font-mono">Loading model…</span>
            </>
          ) : workerStatus === 'error' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-orange-400 text-xs font-mono">Server mode</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs font-mono">LIVE</span>
            </>
          )}
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
            <span className={`ml-3 ${change.status === 'changed' ? 'text-yellow-400' : 'text-slate-400'}`}>
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

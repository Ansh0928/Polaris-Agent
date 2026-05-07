import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const visionUrl = process.env.VISION_API_URL
  if (!visionUrl) return NextResponse.json({ error: 'VISION_API_URL not configured' }, { status: 503 })

  const formData = await req.formData()
  const res = await fetch(`${visionUrl}/detect`, { method: 'POST', body: formData })
  if (!res.ok) return NextResponse.json({ error: 'vision service error' }, { status: 502 })
  return NextResponse.json(await res.json())
}

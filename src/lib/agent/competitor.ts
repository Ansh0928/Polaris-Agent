import { sql } from '@/lib/db'
import type { CompetitorPrice } from '@/types'

const TINYFISH_BASE = 'https://api.tinyfish.ai/v1'

async function tinyFishFetch(url: string): Promise<string> {
  const res = await fetch(`${TINYFISH_BASE}/fetch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`TinyFish fetch failed: ${res.status}`)
  const data = await res.json()
  return data.text ?? data.content ?? ''
}

function extractPrices(text: string): CompetitorPrice[] {
  const prices: CompetitorPrice[] = []
  // Match patterns like "$18.50/kg", "$12.00 per kg", "18.50 AUD"
  const lines = text.split('\n').filter((l) => l.trim())
  for (const line of lines) {
    const priceMatch = line.match(/\$\s*(\d+(?:\.\d{1,2})?)/)
    if (!priceMatch) continue
    const price = parseFloat(priceMatch[1])
    if (price < 0.5 || price > 5000) continue // filter noise
    const unitMatch = line.match(/\/(kg|g|each|ea|lb|litre|L|unit)/i)
    prices.push({
      name: line.slice(0, 80).trim(),
      price_aud: price,
      unit: unitMatch?.[1] ?? 'each',
      raw: line.slice(0, 200),
    })
    if (prices.length >= 10) break
  }
  return prices
}

export async function fetchCompetitorPrices(): Promise<
  Array<{ source_id: string; source_label: string; source_url: string; prices: CompetitorPrice[] }>
> {
  const sources = await sql`SELECT id, label, url FROM competitor_sources ORDER BY created_at ASC`
  const results = []

  for (const source of sources) {
    let prices: CompetitorPrice[] = []
    let error: string | undefined

    try {
      const text = await tinyFishFetch(source.url as string)
      prices = extractPrices(text)
      await sql`
        UPDATE competitor_sources
        SET last_scraped_at = now(),
            last_result = ${JSON.stringify({ prices })}::jsonb
        WHERE id = ${source.id}::uuid
      `
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      await sql`
        UPDATE competitor_sources
        SET last_scraped_at = now(),
            last_result = ${JSON.stringify({ error })}::jsonb
        WHERE id = ${source.id}::uuid
      `
    }

    results.push({
      source_id: source.id as string,
      source_label: source.label as string,
      source_url: source.url as string,
      prices,
      ...(error ? { error } : {}),
    })
  }

  return results
}

import type { FlaggedItem, SupplierResult } from '@/types'

const TINYFISH_BASE = 'https://api.tinyfish.ai/v1'
const SUPPLIERS = [
  'pfdfoodservice.com.au',
  'bidvestfoodservice.com.au',
  'harrisfarm.com.au',
]

async function tinyFishSearch(query: string): Promise<{ url: string; title: string }[]> {
  const res = await fetch(`${TINYFISH_BASE}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 5 }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`TinyFish search failed: ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

async function tinyFishFetch(url: string): Promise<string> {
  const res = await fetch(`${TINYFISH_BASE}/fetch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`TinyFish fetch failed: ${res.status}`)
  const data = await res.json()
  return data.text ?? data.content ?? ''
}

function extractPrice(text: string): number | null {
  const match = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1]
  return match ? parseFloat(match) : null
}

export async function fetchSupplierPrices(flagged: FlaggedItem[]): Promise<SupplierResult[]> {
  const results: SupplierResult[] = []

  for (const { inventory } of flagged) {
    const productName = inventory.product.name
    for (const supplier of SUPPLIERS) {
      try {
        const query = `${productName} price site:${supplier}`
        const searchResults = await tinyFishSearch(query)
        const match = searchResults[0]
        if (!match) continue

        const rawText = await tinyFishFetch(match.url)
        const price = extractPrice(rawText)

        results.push({
          product_name: productName,
          supplier,
          price_aud: price,
          url: match.url,
          raw_text: rawText.slice(0, 500),
        })
      } catch (err) {
        // One supplier failure shouldn't abort the entire loop
        console.error(`Supplier fetch failed for ${productName} @ ${supplier}:`, err)
      }
    }
  }

  return results
}

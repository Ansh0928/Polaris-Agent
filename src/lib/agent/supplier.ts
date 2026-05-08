import type { FlaggedItem, SupplierResult } from '@/types'

const TINYFISH_BASE = 'https://api.tinyfish.ai/v1'
const SUPPLIERS = [
  'pfdfoodservice.com.au',
  'bidvestfoodservice.com.au',
  'harrisfarm.com.au',
]
// Cap at 5 items to bound total fetch time
const MAX_ITEMS = 5

async function tinyFishSearch(query: string): Promise<{ url: string; title: string }[]> {
  const res = await fetch(`${TINYFISH_BASE}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TINYFISH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit: 5 }),
    signal: AbortSignal.timeout(8000),
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
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`TinyFish fetch failed: ${res.status}`)
  const data = await res.json()
  return data.text ?? data.content ?? ''
}

function extractPrice(text: string): number | null {
  const match = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1]
  return match ? parseFloat(match) : null
}

async function fetchOneSupplierPrice(productName: string, supplier: string): Promise<SupplierResult | null> {
  try {
    const query = `${productName} price site:${supplier}`
    let searchResults = await tinyFishSearch(query)
    if (!searchResults.length) {
      const species = productName.split(' ').at(-1) ?? productName
      searchResults = await tinyFishSearch(`${species} price site:${supplier}`)
    }
    const match = searchResults[0]
    if (!match) return null

    const rawText = await tinyFishFetch(match.url)
    return {
      product_name: productName,
      supplier,
      price_aud: extractPrice(rawText),
      url: match.url,
      raw_text: rawText.slice(0, 500),
    }
  } catch (err) {
    console.error(`[supplier] ${productName} @ ${supplier}: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

export async function fetchSupplierPrices(flagged: FlaggedItem[]): Promise<SupplierResult[]> {
  // Quick reachability check — fail fast if TinyFish DNS is down
  try {
    await fetch(`${TINYFISH_BASE}/health`, { signal: AbortSignal.timeout(2500) })
  } catch {
    console.log('[supplier] TinyFish unreachable — skipping supplier price fetch')
    return []
  }

  // Cap items + run all (item × supplier) pairs in parallel
  const items = flagged.slice(0, MAX_ITEMS)
  const pairs: Array<{ productName: string; supplier: string }> = []
  for (const { inventory } of items) {
    for (const supplier of SUPPLIERS) {
      pairs.push({ productName: inventory.product.name, supplier })
    }
  }

  const settled = await Promise.allSettled(
    pairs.map(({ productName, supplier }) => fetchOneSupplierPrice(productName, supplier))
  )

  return settled
    .filter((r): r is PromiseFulfilledResult<SupplierResult> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}

import type { WebsitePrice } from '@/types'

const SITE_API = 'https://www.tasmanstarseafoodmarket.com.au/api/products'

export async function fetchWebsitePrices(): Promise<WebsitePrice[]> {
  try {
    const res = await fetch(`${SITE_API}?category=sashimi&limit=50`, {
      headers: { 'User-Agent': 'Polaris-Agent/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.log(`[website] API returned ${res.status} — returning empty`)
      return []
    }
    const data = await res.json() as { products?: Array<{
      name: string; price: string; unit: string; stockQuantity: number
      isTodaysSpecial: boolean; isFeatured: boolean; category: { name: string }
    }> }
    if (!Array.isArray(data.products)) return []
    return data.products.map((p) => ({
      product_name: p.name,
      retail_price_aud: parseFloat(p.price),
      unit: p.unit.toLowerCase(),
      category: p.category.name,
      stock_quantity: p.stockQuantity,
      is_todays_special: p.isTodaysSpecial,
      is_featured: p.isFeatured,
    }))
  } catch (err) {
    console.log(`[website] fetch failed: ${err instanceof Error ? err.message : err} — returning empty`)
    return []
  }
}

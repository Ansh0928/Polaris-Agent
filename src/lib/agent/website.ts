import type { WebsitePrice } from '@/types'

const SITE_API = 'https://www.tasmanstarseafoodmarket.com.au/api/products'

export async function fetchWebsitePrices(): Promise<WebsitePrice[]> {
  const res = await fetch(`${SITE_API}?category=sashimi&limit=50`, {
    headers: { 'User-Agent': 'Polaris-Agent/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Website API error: ${res.status}`)
  const data = await res.json()

  return (data.products as Array<{
    name: string
    price: string
    unit: string
    stockQuantity: number
    isTodaysSpecial: boolean
    isFeatured: boolean
    category: { name: string }
  }>).map((p) => ({
    product_name: p.name,
    retail_price_aud: parseFloat(p.price),
    unit: p.unit.toLowerCase(),
    category: p.category.name,
    stock_quantity: p.stockQuantity,
    is_todays_special: p.isTodaysSpecial,
    is_featured: p.isFeatured,
  }))
}

import OpenAI from 'openai'
import type { FlaggedItem, SupplierResult, WebsitePrice, InventoryWithProduct, AgentReport } from '@/types'

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? 'ollama',
})

export async function reasonWithHermes(
  flagged: FlaggedItem[],
  supplierPrices: SupplierResult[],
  websitePrices: WebsitePrice[] = [],
  allInventory: InventoryWithProduct[] = [],
): Promise<AgentReport> {
  const today = new Date().toISOString()

  // All inventory with cost prices (for margin matching, not just flagged items)
  const allProductCosts = allInventory
    .filter((inv) => inv.product.cost_price_aud != null)
    .map((inv) => ({
      product: inv.product.name,
      category: inv.product.category,
      unit: inv.product.unit,
      cost_price_aud_per_unit: inv.product.cost_price_aud,
    }))
    // Deduplicate by product name
    .filter((item, idx, arr) => arr.findIndex((x) => x.product === item.product) === idx)

  const inventoryContext = flagged.map(({ inventory, reason }) => ({
    product: inventory.product.name,
    product_id: inventory.product.id,
    category: inventory.product.category,
    quantity: inventory.quantity,
    unit: inventory.product.unit,
    expiry_date: inventory.expiry_date,
    days_to_expiry: inventory.days_to_expiry,
    reorder_threshold: inventory.product.reorder_threshold,
    cost_price_aud: inventory.product.cost_price_aud,
    location: inventory.location,
    flag_reason: reason,
  }))

  const priceContext = supplierPrices.map((s) => ({
    product: s.product_name,
    supplier: s.supplier,
    price_aud: s.price_aud,
    url: s.url,
  }))

  const websiteContext = websitePrices.map((p) => ({
    product: p.product_name,
    retail_price_aud: p.retail_price_aud,
    unit: p.unit,
    stock_quantity: p.stock_quantity,
  }))

  const systemPrompt = `You are Polaris, an autonomous inventory management AI for a fresh food warehouse.
Analyze flagged inventory, supplier prices, and live website retail prices to produce a structured JSON report.

MARGIN CALCULATION RULES:
- Warehouse cost prices are per kg (e.g., Atlantic Salmon = $38/kg)
- Website products are sold as portion packs (e.g., "Salmon sashimi 200g block" at $20)
- To match: find the weight in grams from the product name (e.g., "200g" = 0.2kg)
- Cost for a pack = cost_price_aud_per_kg × weight_kg (e.g., $38 × 0.2 = $7.60)
- Margin = ((retail_price - pack_cost) / retail_price) × 100
- Margin status: healthy ≥ 45% · warning 30–44% · critical < 30%
- Match by species name: "Atlantic Salmon" matches "Salmon sashimi 200g block", "Tiger Prawns" matches "Paradise Prawn", etc.
- If a pack weight cannot be inferred, use the retail_price directly against cost_price (flag unit mismatch in note)
- Only create margin_alerts for products where you can find both a warehouse cost and a website retail price

Be specific with quantities — recommend reorder amounts based on 2-4 weeks of typical warehouse supply.
Always return valid JSON matching the exact schema requested.`

  const userPrompt = `Today: ${today}

Warehouse product cost prices (per unit/kg):
${JSON.stringify(allProductCosts, null, 2)}

Flagged inventory items (expiring soon or low stock):
${JSON.stringify(inventoryContext, null, 2)}

Live supplier prices fetched today:
${JSON.stringify(priceContext, null, 2)}

Live retail prices from tasmanstarseafoodmarket.com.au:
${JSON.stringify(websiteContext, null, 2)}

Return a JSON object with this exact structure:
{
  "generated_at": "${today}",
  "expiry_alerts": [{ "product_name": "", "quantity": 0, "unit": "", "expiry_date": "", "days_to_expiry": 0, "location": "" }],
  "low_stock_alerts": [{ "product_name": "", "quantity": 0, "unit": "", "threshold": 0, "location": "" }],
  "reorder_recommendations": [{ "product_name": "", "product_id": "", "supplier": "", "recommended_qty": 0, "estimated_cost_aud": null, "reason": "" }],
  "supplier_prices": [],
  "website_prices": [],
  "margin_alerts": [{ "product_name": "", "retail_price_aud": 0, "cost_price_aud": 0, "margin_pct": 0, "unit": "", "status": "healthy", "note": "" }],
  "summary": "2-3 sentence executive summary covering inventory alerts and margin intelligence"
}`

  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL ?? 'gemma3:27b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  if (!response.choices?.length) {
    throw new Error('reasonWithHermes: LLM returned no choices')
  }

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Model returned empty response')

  const jsonStr = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const report = JSON.parse(jsonStr) as AgentReport
  // Always populate from our fetched data (overrides model placeholders)
  report.supplier_prices = supplierPrices
  report.website_prices = websitePrices
  report.margin_alerts = report.margin_alerts ?? []
  return report
}

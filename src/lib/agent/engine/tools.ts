import { snapshotInventory } from '@/lib/agent/snapshot'
import { flagItems } from '@/lib/agent/flag'
import { fetchSupplierPrices } from '@/lib/agent/supplier'
import { fetchWebsitePrices } from '@/lib/agent/website'
import { fetchCompetitorPrices } from '@/lib/agent/competitor'
import { writeMemory, readMemory } from './memory'
import { sql } from '@/lib/db'
import type { FlaggedItem } from '@/types'
import type OpenAI from 'openai'

// Tool registry — hermes-style, but TypeScript.
// Each tool has an OpenAI-compatible function definition + an executor.
// The agentic loop calls executeTool() with whatever name+args the LLM chose.

export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_inventory',
      description:
        'Get full current inventory snapshot: product names, quantities, units, expiry dates, locations, and reorder thresholds.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flag_alerts',
      description:
        'Identify all inventory items that are expiring within 7 days OR have quantity at or below the reorder threshold. Returns flagged items with their reason (expiry | low_stock | both).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_supplier_prices',
      description:
        'Fetch live supplier prices from Australian foodservice suppliers (PFD, Bidvest, Harris Farm) for the specified products.',
      parameters: {
        type: 'object',
        properties: {
          product_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Product names to fetch prices for',
          },
        },
        required: ['product_names'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_memory',
      description:
        'Persist a key-value observation for future agent runs — seasonal patterns, supplier preferences, ordering notes. Overwrites any existing entry for the same key.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Short identifier (e.g. "salmon_seasonality")' },
          value: { type: 'string', description: 'Note content to persist' },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_memory',
      description: 'Read all persisted memory entries from previous agent runs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_website_prices',
      description:
        'Fetch live retail prices for sushi and sashimi products from the Tasman Star Seafood website. Returns product names, retail prices (AUD), units, and stock levels. Use this to compare retail prices against warehouse cost prices and calculate profit margins.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'monitor_competitor_prices',
      description:
        'Scrape all configured competitor and supplier URLs for current prices using TinyFish. Returns price data per source to enrich reorder recommendations with market context.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_purchase_order',
      description:
        'Create a draft purchase order for a product. The order is saved as a draft and an approval link is sent via email. Call this after confirming supplier price and reorder recommendation.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: 'UUID of the product to order. Must be the exact `product.id` value returned by check_inventory — do not invent or guess this value.' },
          supplier: { type: 'string', description: 'REQUIRED. Supplier name (e.g. pfdfoodservice.com.au). Use best price from fetch_supplier_prices, or default to "pfdfoodservice.com.au".' },
          qty: { type: 'number', description: 'Quantity to order (in product units)' },
          reason: { type: 'string', description: 'Why this order is being created — included in approval email' },
          price_per_unit_aud: { type: 'number', description: 'Live price per unit in AUD (optional)' },
        },
        required: ['product_id', 'supplier', 'qty', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_decision',
      description:
        'Log a significant agent decision with its reason for the audit trail. Call this whenever you make a non-trivial choice: choosing a supplier, skipping a reorder, escalating an alert.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'What action was taken or decided' },
          reason: { type: 'string', description: 'Why this decision was made' },
        },
        required: ['action', 'reason'],
      },
    },
  },
]

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context?: { runId?: string },
): Promise<string> {
  switch (name) {
    case 'check_inventory': {
      const snapshot = await snapshotInventory()
      return JSON.stringify(
        snapshot.map((i) => ({
          id: i.id,
          product: { id: i.product.id, name: i.product.name },
          category: i.product.category,
          quantity: i.quantity,
          unit: i.product.unit,
          reorder_threshold: i.product.reorder_threshold,
          expiry_date: i.expiry_date,
          days_to_expiry: i.days_to_expiry,
          location: i.location,
        })),
      )
    }

    case 'flag_alerts': {
      const snapshot = await snapshotInventory()
      const flagged = flagItems(snapshot)
      // Return the full FlaggedItem shape so the route can parse it directly
      return JSON.stringify(flagged)
    }

    case 'fetch_supplier_prices': {
      const productNames = (args.product_names as string[]) ?? []
      const snapshot = await snapshotInventory()
      // Build FlaggedItem[] for the requested products
      const targets: FlaggedItem[] = snapshot
        .filter((i) => productNames.includes(i.product.name))
        .map((i) => ({ inventory: i, reason: 'low_stock' as const }))
      if (!targets.length) return JSON.stringify([])
      const results = await fetchSupplierPrices(targets)
      if (results.length === 0 && targets.length > 0) {
        return JSON.stringify({
          results: [],
          status: 'api_unavailable',
          note: `No supplier prices returned for [${productNames.slice(0, 5).join(', ')}]. TinyFish API appears unavailable or key is invalid. Use cost_price_aud from inventory for margin analysis. Call write_memory with key="supplier_price_status" noting today's date and this failure.`,
        })
      }
      return JSON.stringify(results)
    }

    case 'write_memory': {
      const key = String(args.key ?? '')
      const value = String(args.value ?? '')
      await writeMemory(key, value, context?.runId)
      return JSON.stringify({ ok: true, key })
    }

    case 'read_memory': {
      const rows = await readMemory()
      return JSON.stringify(rows)
    }

    case 'check_website_prices': {
      const prices = await fetchWebsitePrices()
      return JSON.stringify(prices)
    }

    case 'monitor_competitor_prices': {
      const results = await fetchCompetitorPrices()
      return JSON.stringify(results)
    }

    case 'create_purchase_order': {
      const productId = String(args.product_id ?? '')
      const supplier = String(args.supplier ?? '')
      const qty = Number(args.qty ?? 0)
      const reason = String(args.reason ?? '')
      const pricePerUnit = args.price_per_unit_aud != null ? Number(args.price_per_unit_aud) : null
      const runId = context?.runId ?? null

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!productId || !UUID_RE.test(productId)) {
        return JSON.stringify({ error: 'create_purchase_order: product_id must be a valid UUID from check_inventory output — call check_inventory first and use the product.id field' })
      }
      if (!supplier || qty <= 0) {
        return JSON.stringify({ error: 'create_purchase_order: supplier and qty > 0 are required' })
      }

      const rows = await sql`
        INSERT INTO purchase_orders (run_id, product_id, supplier, qty, price_per_unit_aud, agent_reason)
        VALUES (
          ${runId}::uuid,
          ${productId}::uuid,
          ${supplier},
          ${qty},
          ${pricePerUnit},
          ${reason}
        )
        RETURNING id, approve_token
      `
      const order = rows[0]
      return JSON.stringify({ ok: true, order_id: order.id, approve_token: order.approve_token })
    }

    case 'log_decision': {
      const action = String(args.action ?? '')
      const reason = String(args.reason ?? '')
      const runId = context?.runId ?? null

      if (!action || !reason) {
        return JSON.stringify({ error: 'log_decision: action and reason are required' })
      }

      await sql`
        INSERT INTO decision_log (run_id, action, reason)
        VALUES (${runId}::uuid, ${action}, ${reason})
      `
      return JSON.stringify({ ok: true })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

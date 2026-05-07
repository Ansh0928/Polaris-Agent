import { snapshotInventory } from '@/lib/agent/snapshot'
import { flagItems } from '@/lib/agent/flag'
import { fetchSupplierPrices } from '@/lib/agent/supplier'
import { fetchWebsitePrices } from '@/lib/agent/website'
import { fetchCompetitorPrices } from '@/lib/agent/competitor'
import { writeMemory, readMemory } from './memory'
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
]

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
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
      return JSON.stringify(results)
    }

    case 'write_memory': {
      const key = String(args.key ?? '')
      const value = String(args.value ?? '')
      await writeMemory(key, value)
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

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

import type { FlaggedItem, SupplierResult, WebsitePrice, InventoryWithProduct, ToolTrace, ReasoningBlock } from '@/types'
import { TOOL_DEFINITIONS, executeTool } from './tools'
import { loadMemory } from './memory'
import { loadSkills } from './skills'
import { createOllamaClient, type OpenAIStyleMessage } from '@/lib/ollama-client'

const client = createOllamaClient(process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1')

const MODEL = process.env.LLM_MODEL ?? 'qwen3:14b'
const MAX_ITERATIONS = 12

function extractThinkBlocks(text: string): string[] {
  const blocks: string[] = []
  const regex = /<think>([\s\S]*?)<\/think>|<thinking>([\s\S]*?)<\/thinking>|<reasoning>([\s\S]*?)<\/reasoning>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const content = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    if (content) blocks.push(content)
  }
  return blocks
}

function stripThinkBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim()
}

export interface ToolCallRecord {
  name: string
  args: Record<string, unknown>
  result: string
}

export interface ToolCallEvent {
  type: 'tool_start' | 'tool_done' | 'reasoning' | 'done' | 'error'
  tool?: string
  args?: Record<string, unknown>
  output?: string
  duration_ms?: number
  text?: string
  iteration?: number
}

export interface LoopResult {
  response: string
  toolCalls: ToolCallRecord[]
  flagged: FlaggedItem[]
  allInventory: InventoryWithProduct[]
  supplierPrices: SupplierResult[]
  websitePrices: WebsitePrice[]
  toolTrace: ToolTrace[]
  reasoningBlocks: ReasoningBlock[]
  iterations: number
}

export async function runAgentLoop(
  userMessage: string,
  onEvent?: (event: ToolCallEvent) => void,
): Promise<LoopResult> {
  const [memory, skills] = await Promise.all([loadMemory(), Promise.resolve(loadSkills())])

  const systemPrompt = [
    'You are Polaris, an autonomous fresh food warehouse inventory management agent.',
    'Your role: analyse current stock levels, identify expiry and reorder risks,',
    'fetch live supplier prices, and generate clear reorder recommendations.',
    'Use the available tools to gather data before synthesising recommendations.',
    'Be specific — include product names, quantities (with units), and AUD prices.',
    'After gathering data, save any useful observations via write_memory.',
    memory,
    skills,
  ]
    .filter(Boolean)
    .join('\n')

  const messages: OpenAIStyleMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  const allToolCalls: ToolCallRecord[] = []
  const toolTrace: ToolTrace[] = []
  const reasoningBlocks: ReasoningBlock[] = []
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.2,
    })

    if (!response.choices?.length) {
      // Log the raw response to help diagnose rate limits or model errors
      console.error('[loop] LLM empty choices:', JSON.stringify(response))
      throw new Error(`LLM returned no choices — model may be unavailable (model=${MODEL}, iteration=${iterations})`)
    }
    const msg = response.choices[0].message

    // Capture reasoning blocks before stripping
    if (msg.content) {
      const blocks = extractThinkBlocks(msg.content)
      for (const text of blocks) {
        reasoningBlocks.push({ after_tool_index: allToolCalls.length - 1, text })
        onEvent?.({ type: 'reasoning', text, iteration: iterations })
      }
    }

    messages.push(msg as OpenAIStyleMessage)

    if (!msg.tool_calls?.length) {
      const response_text = stripThinkBlocks(msg.content ?? '')

      // Extract typed data from tool call logs for downstream pipeline
      const flagged = allToolCalls
        .filter((tc) => tc.name === 'flag_alerts')
        .flatMap((tc) => {
          try { return JSON.parse(tc.result) as FlaggedItem[] } catch { return [] }
        })

      const allInventory = allToolCalls
        .filter((tc) => tc.name === 'check_inventory')
        .flatMap((tc) => {
          try { return JSON.parse(tc.result) as InventoryWithProduct[] } catch { return [] }
        })

      const supplierPrices = allToolCalls
        .filter((tc) => tc.name === 'fetch_supplier_prices')
        .flatMap((tc) => {
          try { return JSON.parse(tc.result) as SupplierResult[] } catch { return [] }
        })

      const websitePrices = allToolCalls
        .filter((tc) => tc.name === 'check_website_prices')
        .flatMap((tc) => {
          try { return JSON.parse(tc.result) as WebsitePrice[] } catch { return [] }
        })

      onEvent?.({ type: 'done', iteration: iterations })
      return { response: response_text, toolCalls: allToolCalls, flagged, allInventory, supplierPrices, websitePrices, toolTrace, reasoningBlocks, iterations }
    }

    // Execute each tool call and collect results
    const toolResults: OpenAIStyleMessage[] = []

    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown> = {}
      const fn = 'function' in tc ? tc.function : null
      try {
        args = JSON.parse((fn?.arguments) || '{}')
      } catch {
        // Malformed args — pass empty object
      }

      const toolName = fn?.name ?? ''
      onEvent?.({ type: 'tool_start', tool: toolName, args, iteration: iterations })

      const start = Date.now()
      let result = ''
      let toolError: string | undefined
      try {
        result = await executeTool(toolName, args)
      } catch (err) {
        toolError = err instanceof Error ? err.message : String(err)
        result = JSON.stringify({ error: toolError })
      }
      const duration_ms = Date.now() - start

      allToolCalls.push({ name: toolName, args, result })
      toolTrace.push({ tool: toolName, input: args, output: result.slice(0, 2000), duration_ms, ...(toolError ? { error: toolError } : {}) })
      onEvent?.({ type: 'tool_done', tool: toolName, output: result.slice(0, 500), duration_ms, iteration: iterations })

      toolResults.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }

    messages.push(...toolResults)
  }

  return {
    response: 'Max iterations reached without final response.',
    toolCalls: allToolCalls,
    flagged: [],
    allInventory: [],
    supplierPrices: [],
    websitePrices: [],
    toolTrace,
    reasoningBlocks,
    iterations,
  }
}

import type { FlaggedItem, SupplierResult, WebsitePrice, InventoryWithProduct, ToolTrace, ReasoningBlock } from '@/types'
import { TOOL_DEFINITIONS, executeTool } from './tools'
import { loadMemory } from './memory'
import { loadSkills } from './skills'
import { createClientForRun, type OpenAIStyleMessage } from '@/lib/ollama-client'
import { saveCheckpoint } from './checkpoint'
import { withRetry } from './retry'

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
  type: 'tool_start' | 'tool_done' | 'reasoning' | 'done' | 'error' | 'email_sent'
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

function extractLoopData(allToolCalls: ToolCallRecord[]) {
  const flagged = allToolCalls
    .filter((tc) => tc.name === 'flag_alerts')
    .flatMap((tc) => { try { return JSON.parse(tc.result) as FlaggedItem[] } catch { return [] } })

  const allInventory = allToolCalls
    .filter((tc) => tc.name === 'check_inventory')
    .flatMap((tc) => { try { return JSON.parse(tc.result) as InventoryWithProduct[] } catch { return [] } })

  const supplierPrices = allToolCalls
    .filter((tc) => tc.name === 'fetch_supplier_prices')
    .flatMap((tc) => { try { return JSON.parse(tc.result) as SupplierResult[] } catch { return [] } })

  const websitePrices = allToolCalls
    .filter((tc) => tc.name === 'check_website_prices')
    .flatMap((tc) => { try { return JSON.parse(tc.result) as WebsitePrice[] } catch { return [] } })

  return { flagged, allInventory, supplierPrices, websitePrices }
}

export async function runAgentLoop(
  userMessage: string,
  onEvent?: (event: ToolCallEvent) => void,
  runId?: string,
): Promise<LoopResult> {
  const [memory, skills] = await Promise.all([loadMemory(), Promise.resolve(loadSkills())])

  const llmBaseUrl = process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1'

  const systemPrompt = [
    'You are Polaris, an autonomous fresh food warehouse inventory management agent.',
    'Your role: analyse current stock levels, identify expiry and reorder risks,',
    'fetch live supplier prices, and generate clear reorder recommendations.',
    'Use the available tools to gather data before synthesising recommendations.',
    'Be specific -- include product names, quantities (with units), and AUD prices.',
    'After gathering data, save any useful observations via write_memory.',
    'Workflow: check_inventory -> flag_alerts -> fetch_supplier_prices -> check_website_prices -> write_memory -> respond.',
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
  const calledTools = new Set<string>()
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await withRetry(async () => {
      const client = await createClientForRun(llmBaseUrl)
      return client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2,
      })
    }, 3, 1000)

    if (!response.choices?.length) {
      console.error('[loop] LLM empty choices:', JSON.stringify(response))
      throw new Error(`LLM returned no choices (model=${MODEL}, iteration=${iterations})`)
    }
    const msg = response.choices[0].message

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
      onEvent?.({ type: 'done', iteration: iterations })
      return { response: response_text, toolCalls: allToolCalls, ...extractLoopData(allToolCalls), toolTrace, reasoningBlocks, iterations }
    }

    const toolResults: OpenAIStyleMessage[] = []
    let hadErrors = false

    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown> = {}
      const fn = 'function' in tc ? tc.function : null
      try {
        args = JSON.parse((fn?.arguments) || '{}')
      } catch {
        // malformed args -- use empty object
      }

      const toolName = fn?.name ?? ''
      const callId = tc.id

      // Code-level dedup: text directive alone can be ignored by the model
      if (calledTools.has(toolName)) {
        console.log(`[loop] dedup: skipping duplicate call to ${toolName}`)
        toolResults.push({
          role: 'tool',
          tool_call_id: callId,
          content: JSON.stringify({ error: `Tool "${toolName}" already called this run -- duplicate skipped` }),
        })
        continue
      }

      calledTools.add(toolName)
      onEvent?.({ type: 'tool_start', tool: toolName, args, iteration: iterations })

      const start = Date.now()
      let result = ''
      let toolError: string | undefined
      try {
        result = await executeTool(toolName, args, { runId })
      } catch (err) {
        toolError = err instanceof Error ? err.message : String(err)
        result = JSON.stringify({ error: toolError })
      }
      const duration_ms = Date.now() - start

      if (toolError) hadErrors = true

      allToolCalls.push({ name: toolName, args, result })
      toolTrace.push({ tool: toolName, input: args, output: result.slice(0, 2000), duration_ms, ...(toolError ? { error: toolError } : {}) })
      onEvent?.({ type: 'tool_done', tool: toolName, output: result.slice(0, 500), duration_ms, iteration: iterations })

      toolResults.push({ role: 'tool', tool_call_id: callId, content: result })
    }

    messages.push(...toolResults)

    // Workflow nudge: steer the model to the next required step
    {
      const done = new Set(allToolCalls.map((tc) => tc.name))
      const toolsThisIter = (msg.tool_calls as Array<{ function?: { name: string } }>).map((tc) => tc.function?.name ?? '')
      if (toolsThisIter.includes('flag_alerts') && !done.has('fetch_supplier_prices')) {
        const flaggedNames = extractLoopData(allToolCalls).flagged.map((f) => f.inventory.product.name).slice(0, 6)
        if (flaggedNames.length > 0) {
          messages.push({
            role: 'user',
            content: `Good. Now call fetch_supplier_prices with product_names: ${JSON.stringify(flaggedNames)} to get live AUD prices from PFD, Bidvest, and Harris Farm.`,
          })
        }
      } else if (toolsThisIter.includes('fetch_supplier_prices') && !done.has('check_website_prices')) {
        messages.push({
          role: 'user',
          content: 'Now call check_website_prices to fetch retail prices from the Tasman Star website for margin analysis.',
        })
      } else if (toolsThisIter.includes('check_website_prices') && !done.has('write_memory')) {
        messages.push({
          role: 'user',
          content: 'Now call write_memory to save any useful observations (e.g. margin trends, supplier preferences, seasonal notes). Then respond with your final analysis.',
        })
      }
    }

    // Reflection: guide model recovery after all tool results are pushed
    if (hadErrors) {
      const errSummary = toolResults
        .filter((r) => { try { return 'error' in JSON.parse(r.content ?? '') } catch { return false } })
        .map((r) => { try { return (JSON.parse(r.content ?? '') as { error: string }).error } catch { return '' } })
        .filter(Boolean)
        .join('; ')

      messages.push({
        role: 'user',
        content: `Tool call failed: ${errSummary}. Consider: (1) retry with different args, (2) skip this step and note the gap, (3) use an alternative tool. Choose the best recovery path and continue.`,
      })
    }

    // Stall detection: same 3-tool sequence repeated twice = model looping
    if (allToolCalls.length >= 6) {
      const last3 = allToolCalls.slice(-3).map((tc) => tc.name).join(',')
      const prev3 = allToolCalls.slice(-6, -3).map((tc) => tc.name).join(',')
      if (last3 === prev3) {
        messages.push({
          role: 'user',
          content: 'You are repeating the same tool sequence. Stop collecting data and write your final response now.',
        })
      }
    }

    // Checkpoint every 3 iterations
    if (runId && iterations % 3 === 0) {
      await saveCheckpoint(runId, iterations, messages, allToolCalls)
    }
  }

  const loopData = extractLoopData(allToolCalls)
  onEvent?.({ type: 'done', iteration: iterations })
  return {
    response: `Analysis reached max iterations (${MAX_ITERATIONS}). Collected: ${allToolCalls.length} tool calls, ${loopData.flagged.length} flagged items.`,
    toolCalls: allToolCalls,
    ...loopData,
    toolTrace,
    reasoningBlocks,
    iterations,
  }
}

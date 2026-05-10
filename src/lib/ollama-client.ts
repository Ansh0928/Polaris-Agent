/**
 * Thin wrapper over Ollama's native /api/chat endpoint.
 * Uses think:false to skip Qwen3 extended thinking (~10x faster per call).
 * Exposes an OpenAI-compatible interface so loop.ts / reason.ts are unchanged.
 */

type Role = 'system' | 'user' | 'assistant' | 'tool'

interface OllamaMessage {
  role: Role
  content: string
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>
}

interface OllamaResponse {
  message: OllamaMessage
  done_reason: string
  done: boolean
}

export interface OpenAIStyleMessage {
  role: string
  content: string | null
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

function toOllamaMessages(messages: OpenAIStyleMessage[]): OllamaMessage[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content ?? '' }
    }
    if (m.tool_calls?.length) {
      return {
        role: 'assistant',
        content: m.content ?? '',
        tool_calls: m.tool_calls.map((tc) => ({
          function: {
            name: tc.function.name,
            arguments: (() => { try { return JSON.parse(tc.function.arguments || '{}') } catch { return {} } })(),
          },
        })),
      }
    }
    return { role: m.role as Role, content: m.content ?? '' }
  })
}

function fromOllamaResponse(data: OllamaResponse) {
  const msg = data.message
  const toolCalls = msg.tool_calls?.map((tc, i) => ({
    id: `call_${i}`,
    type: 'function' as const,
    function: {
      name: tc.function.name,
      arguments: JSON.stringify(tc.function.arguments ?? {}),
    },
  }))

  return {
    choices: [
      {
        message: {
          role: msg.role,
          content: msg.content || null,
          ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: data.done_reason ?? 'stop',
      },
    ],
  }
}

export async function checkOllamaHealth(llmBaseUrl: string): Promise<boolean> {
  try {
    const base = llmBaseUrl.trim().replace(/\/v1\/?$/, '')
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

function parseRetryAfterMs(errorBody: string, headers: Headers): number {
  const retryAfterHeader = headers.get('retry-after')
  if (retryAfterHeader) return parseFloat(retryAfterHeader) * 1000 + 500
  const textMatch = errorBody.match(/try again in ([\d.]+)s/)
  if (textMatch) return Math.ceil(parseFloat(textMatch[1]) * 1000) + 500
  // OpenRouter JSON: {"error":{"metadata":{"retry_after_seconds":N}}}
  const jsonMatch = errorBody.match(/"retry_after_seconds"\s*:\s*([\d.]+)/)
  if (jsonMatch) return Math.ceil(parseFloat(jsonMatch[1]) * 1000) + 500
  return 15_000
}

function makeOpenAICompatClient(
  endpoint: string,
  apiKey: string,
  defaultModel: string,
  label: string,
  timeoutMs = 60_000,
  maxRetries = 2,
) {
  const create = async (params: {
    model: string
    messages: OpenAIStyleMessage[]
    tools?: unknown[]
    tool_choice?: string
    temperature?: number
    response_format?: { type: string }
    [key: string]: unknown
  }) => {
    const body: Record<string, unknown> = {
      model: defaultModel,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      stream: false,
    }
    if (params.tools && (params.tools as unknown[]).length > 0) body.tools = params.tools
    if (params.tool_choice) body.tool_choice = params.tool_choice
    if (params.response_format) body.response_format = params.response_format

    const MAX_RATE_LIMIT_RETRIES = maxRetries
    for (let attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES + 1; attempt++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (response.status === 429) {
        const text = await response.text()
        if (attempt > MAX_RATE_LIMIT_RETRIES) throw new Error(`${label} 429: ${text}`)
        const delayMs = parseRetryAfterMs(text, response.headers)
        console.log(`[${label}] rate limited — waiting ${delayMs}ms (attempt ${attempt}/${MAX_RATE_LIMIT_RETRIES})`)
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`${label} ${response.status}: ${text}`)
      }

      return response.json()
    }

    throw new Error(`${label}: max rate limit retries exceeded`)
  }

  return { chat: { completions: { create } } }
}

export function createGroqClient() {
  return makeOpenAICompatClient(
    'https://api.groq.com/openai/v1/chat/completions',
    (process.env.GROQ_API_KEY ?? '').trim(),
    // llama-3.1-8b-instant: 20,000 TPM vs 6,000 TPM for 70b — avoids rate-limit waits in 9-iter loop
    (process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant').trim(),
    'Groq',
    60_000,
    1,  // fail fast on 429, cascade to OpenRouter rather than waiting 15s × 2
  )
}

export function createOpenRouterClient() {
  return makeOpenAICompatClient(
    'https://openrouter.ai/api/v1/chat/completions',
    process.env.OPENROUTER_API_KEY ?? '',
    // gpt-oss-20b: 131k context, reliable tool calling, no TPM cap on free tier
    (process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-20b:free').trim(),
    'OpenRouter',
    45_000,
    1,  // retry once after parsing retry_after_seconds before cascading to Groq
  )
}

type LLMClient = ReturnType<typeof createOllamaClient>

function sanitizeMessagesForGroq(messages: OpenAIStyleMessage[]): OpenAIStyleMessage[] {
  // Groq rejects: content:null on assistant messages, and unsupported fields like reasoning_details
  return messages.map((m) => {
    if (m.role !== 'assistant') return m
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reasoning_details, ...rest } = m as OpenAIStyleMessage & { reasoning_details?: unknown }
    return { ...rest, content: rest.content ?? '' }
  })
}

function withGroqFallback(primary: LLMClient, label: string): LLMClient {
  const groqKey = (process.env.GROQ_API_KEY ?? '').trim()
  if (!groqKey) return primary
  const groq = createGroqClient()
  const primaryCreate = primary.chat.completions.create
  return {
    chat: {
      completions: {
        create: async (params) => {
          try {
            return await primaryCreate(params)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            // Cascade on: rate limits, timeouts, and provider-specific errors
            const shouldCascade = msg.includes('429') || msg.includes('rate limit') ||
              msg.includes('timeout') || err instanceof Error && err.name === 'TimeoutError' ||
              (msg.startsWith('OpenRouter') && msg.includes('retry_after_seconds'))
            if (shouldCascade) {
              console.log(`[loop] ${label} unavailable (${msg.slice(0, 80)}) — cascading to Groq`)
              const sanitized = { ...params, messages: sanitizeMessagesForGroq(params.messages) }
              return groq.chat.completions.create(sanitized)
            }
            throw err
          }
        },
      },
    },
  }
}

export async function createClientForRun(llmBaseUrl: string) {
  const healthy = await checkOllamaHealth(llmBaseUrl)
  if (healthy) return createOllamaClient(llmBaseUrl)
  console.log('[loop] Ollama unreachable — trying fallbacks')

  // Prefer OpenRouter: no hard TPM cap — Groq free tier caps at 6k TPM which is below our context size
  if (process.env.OPENROUTER_API_KEY) {
    console.log('[loop] routing to OpenRouter')
    return withGroqFallback(createOpenRouterClient(), 'OpenRouter')
  }

  if ((process.env.GROQ_API_KEY ?? '').trim()) {
    console.log('[loop] routing to Groq (llama-3.1-8b-instant)')
    return createGroqClient()
  }

  throw new Error('No LLM available: Ollama unreachable and no API keys configured')
}

export function createOllamaClient(llmBaseUrl: string) {
  const ollamaBase = llmBaseUrl.trim().replace(/\/v1\/?$/, '')

  const create = async (params: {
    model: string
    messages: OpenAIStyleMessage[]
    tools?: unknown[]
    tool_choice?: string
    temperature?: number
    response_format?: { type: string }
    max_tokens?: number
    // ignored: think, thinking — handled natively
    [key: string]: unknown
  }) => {
    const body: Record<string, unknown> = {
      model: params.model,
      think: false,
      stream: false,
      messages: toOllamaMessages(params.messages),
      options: { temperature: params.temperature ?? 0.2, num_predict: params.max_tokens ?? 300 },
    }

    if (params.tools && (params.tools as unknown[]).length > 0) {
      body.tools = params.tools
    }

    if (params.response_format?.type === 'json_object') {
      body.format = 'json'
    }

    const response = await fetch(`${ollamaBase}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55_000),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama ${response.status}: ${text}`)
    }

    const data = (await response.json()) as OllamaResponse
    return fromOllamaResponse(data)
  }

  return {
    chat: {
      completions: { create },
    },
  }
}

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

export function createGroqClient() {
  const model = process.env.CLOUD_FALLBACK_MODEL ?? 'llama-3.3-70b-versatile'

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
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      stream: false,
    }
    if (params.tools && (params.tools as unknown[]).length > 0) body.tools = params.tools
    if (params.tool_choice) body.tool_choice = params.tool_choice
    if (params.response_format) body.response_format = params.response_format

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(22_000),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Groq ${response.status}: ${text}`)
    }

    return response.json()
  }

  return { chat: { completions: { create } } }
}

export async function createClientForRun(llmBaseUrl: string) {
  const isExplicit = !!process.env.LLM_BASE_URL
  const healthy = isExplicit ? true : await checkOllamaHealth(llmBaseUrl)
  if (!healthy && process.env.GROQ_API_KEY) {
    console.log('[loop] Ollama unreachable, routing to cloud fallback (Groq)')
    return createGroqClient()
  }
  return createOllamaClient(llmBaseUrl)
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
    // ignored: think, thinking — handled natively
    [key: string]: unknown
  }) => {
    const body: Record<string, unknown> = {
      model: params.model,
      think: false,
      stream: false,
      messages: toOllamaMessages(params.messages),
      options: { temperature: params.temperature ?? 0.2 },
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
      signal: AbortSignal.timeout(22_000),
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

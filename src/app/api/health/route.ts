import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { checkOllamaHealth } from '@/lib/ollama-client'

export async function GET() {
  const llmBaseUrl = (process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1').trim()

  const [dbOk, tunnelOk] = await Promise.all([
    sql`SELECT 1`.then(() => true).catch(() => false),
    checkOllamaHealth(llmBaseUrl),
  ])

  const groqOk = !!(process.env.GROQ_API_KEY ?? '').trim()
  const openRouterOk = !!process.env.OPENROUTER_API_KEY
  const llmReady = tunnelOk || groqOk || openRouterOk

  const domainHint = llmBaseUrl
    .replace(/\/v1\/?$/, '')
    .replace(/^https?:\/\//, '')
    .split('.')
    .slice(-3)
    .join('.')

  const status = dbOk && llmReady ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status,
      db: dbOk ? 'ok' : 'error',
      tunnel: tunnelOk ? 'ok' : 'down',
      groq_fallback: groqOk ? 'configured' : 'missing',
      openrouter_fallback: openRouterOk ? 'configured' : 'missing',
      llm_ready: llmReady,
      llm_endpoint: domainHint,
      checked_at: new Date().toISOString(),
    },
    { status: status === 'ok' ? 200 : 503 },
  )
}

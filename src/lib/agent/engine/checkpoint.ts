import { sql } from '@/lib/db'
import type { ToolCallRecord } from './loop'
import type { OpenAIStyleMessage } from '@/lib/ollama-client'

export async function loadCheckpoint(runId: string): Promise<{
  iteration: number
  messages: OpenAIStyleMessage[]
  allToolCalls: ToolCallRecord[]
} | null> {
  try {
    const rows = await sql`
      SELECT partial_state FROM agent_runs
      WHERE id = ${runId}::uuid AND status = 'running' AND partial_state IS NOT NULL
    `
    if (!rows.length || !rows[0].partial_state) return null
    return rows[0].partial_state as { iteration: number; messages: OpenAIStyleMessage[]; allToolCalls: ToolCallRecord[] }
  } catch (err) {
    console.error('[checkpoint] load failed (non-fatal):', err, { runId })
    return null
  }
}

export async function saveCheckpoint(
  runId: string,
  iteration: number,
  messages: OpenAIStyleMessage[],
  allToolCalls: ToolCallRecord[],
): Promise<void> {
  try {
    await sql`
      UPDATE agent_runs
      SET partial_state = ${JSON.stringify({ iteration, messages, allToolCalls })}::jsonb,
          status = 'running'
      WHERE id = ${runId}::uuid
    `
  } catch (err) {
    console.error('[checkpoint] save failed (non-fatal):', err, { runId, iteration })
  }
}

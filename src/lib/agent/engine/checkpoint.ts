import { sql } from '@/lib/db'
import type { ToolCallRecord } from './loop'
import type { OpenAIStyleMessage } from '@/lib/ollama-client'

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

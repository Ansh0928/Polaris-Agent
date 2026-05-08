import { sql } from '@/lib/db'

// Cross-run memory: key/value store persisted in agent_memory table.
// Injected into system prompt at session start (like hermes MEMORY.md).
// Written mid-run via write_memory tool; refreshes next session.

export async function loadMemory(): Promise<string> {
  const rows = await sql`SELECT key, value FROM agent_memory ORDER BY key`
  if (!rows.length) return ''
  const entries = rows.map((r) => `§ ${r.key}\n${r.value}`).join('\n\n')
  return `\n\n## Agent Memory (persisted from previous runs)\n\n${entries}`
}

export async function writeMemory(key: string, value: string, runId?: string | null): Promise<void> {
  await sql`
    INSERT INTO agent_memory (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `
  await sql`
    INSERT INTO agent_memory_history (key, value, run_id)
    VALUES (${key}, ${value}, ${runId ?? null}::uuid)
  `
}

export async function readMemory(): Promise<Array<{ key: string; value: string; updated_at: string }>> {
  const rows = await sql`SELECT key, value, updated_at FROM agent_memory ORDER BY key`
  return rows as Array<{ key: string; value: string; updated_at: string }>
}

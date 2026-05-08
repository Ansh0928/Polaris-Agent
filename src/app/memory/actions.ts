'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteMemoryEntry(key: string) {
  await sql`DELETE FROM agent_memory WHERE key = ${key}`
  revalidatePath('/memory')
}

export async function updateMemoryEntry(key: string, value: string) {
  await sql`
    UPDATE agent_memory SET value = ${value}, updated_at = now() WHERE key = ${key}
  `
  await sql`
    INSERT INTO agent_memory_history (key, value, run_id) VALUES (${key}, ${value}, null)
  `
  revalidatePath('/memory')
}

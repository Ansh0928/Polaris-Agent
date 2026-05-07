import { sql } from '@/lib/db'
import { CompetitorsClient } from './CompetitorsClient'
import type { CompetitorSource } from '@/types'

export const dynamic = 'force-dynamic'

export default async function CompetitorsPage() {
  const rows = await sql`
    SELECT id, label, url, last_scraped_at, last_result, created_at
    FROM competitor_sources ORDER BY created_at ASC
  `
  return <CompetitorsClient initial={rows as unknown as CompetitorSource[]} />
}

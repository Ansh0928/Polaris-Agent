import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = neon(process.env.DATABASE_URL!)

function splitStatements(content: string): string[] {
  return content
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function runFile(path: string) {
  const content = readFileSync(join(process.cwd(), path), 'utf8')
  const statements = splitStatements(content)
  for (const statement of statements) {
    await sql.query(statement)
  }
}

async function run() {
  console.log('Dropping all tables...')
  await runFile('migrations/000_drop_all.sql')
  console.log('Dropped.')

  console.log('Running initial schema...')
  await runFile('migrations/001_initial.sql')

  console.log('Running agent memory migration...')
  await runFile('migrations/002_agent_memory.sql')

  console.log('Running location columns migration...')
  await runFile('migrations/003_location_columns.sql')

  console.log('Running cost price migration...')
  await runFile('migrations/004_cost_price.sql')

  console.log('Running competitor sources migration...')
  await runFile('migrations/005_competitor_sources.sql')

  console.log('Schema created successfully.')
}

run().catch((e) => { console.error(e); process.exit(1) })

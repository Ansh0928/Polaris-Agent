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

// Full reset (dev only -- drops all tables then rebuilds from scratch)
async function runFull() {
  console.log('Dropping all tables...')
  await runFile('migrations/000_drop_all.sql')

  const migrations = [
    '001_initial.sql',
    '002_agent_memory.sql',
    '003_location_columns.sql',
    '004_cost_price.sql',
    '005_competitor_sources.sql',
    '006_scanner.sql',
    '007_purchase_orders.sql',
    '008_decision_log.sql',
    '009_agent_runs_partial.sql',
    '010_memory_history.sql',
  ]

  for (const file of migrations) {
    console.log(`Running ${file}...`)
    await runFile(`migrations/${file}`)
  }

  console.log('Schema created successfully.')
}

// Incremental (production-safe -- only runs new migrations)
async function runIncremental() {
  const newMigrations = [
    '010_memory_history.sql',
  ]

  for (const file of newMigrations) {
    console.log(`Applying ${file}...`)
    await runFile(`migrations/${file}`)
  }

  console.log('Incremental migrations applied.')
}

const mode = process.argv[2]
if (mode === '--incremental') {
  runIncremental().catch((e) => { console.error(e); process.exit(1) })
} else {
  runFull().catch((e) => { console.error(e); process.exit(1) })
}

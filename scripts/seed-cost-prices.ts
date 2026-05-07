import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sql = neon(process.env.DATABASE_URL!)

// Realistic Australian wholesale cost prices per unit
const costPrices: Record<string, number> = {
  'Atlantic Salmon':  38.00,  // $/kg wholesale → ~$100/kg retail via sashimi packs
  'Barramundi':       28.00,  // $/kg
  'Tiger Prawns':     35.00,  // $/kg
  'Oysters':          14.00,  // $/dozen
  'Eye Fillet':       55.00,  // $/kg
  'Chicken Breast':    7.50,  // $/kg
  'Wagyu Striploin': 110.00,  // $/kg
  'Lamb Cutlets':     32.00,  // $/kg
  'Full Cream Milk':   1.60,  // $/L
  'Thickened Cream':   4.20,  // $/L
  'Unsalted Butter':  11.00,  // $/kg
  'Cherry Tomatoes':   7.50,  // $/kg
  'Baby Spinach':     11.00,  // $/kg
  'Avocado':           1.10,  // $/each
}

async function seed() {
  console.log('Seeding cost prices...')
  for (const [name, cost] of Object.entries(costPrices)) {
    const result = await sql`
      UPDATE products SET cost_price_aud = ${cost} WHERE name = ${name}
      RETURNING name, cost_price_aud
    `
    if (result.length > 0) {
      console.log(`  ${name}: $${cost}`)
    } else {
      console.warn(`  [NOT FOUND] ${name}`)
    }
  }
  console.log('Done.')
}

seed().catch((e) => { console.error(e); process.exit(1) })

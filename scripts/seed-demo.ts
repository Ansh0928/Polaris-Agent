import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const products = [
  { name: 'Atlantic Salmon', category: 'fish', unit: 'kg', threshold: 15 },
  { name: 'Barramundi', category: 'fish', unit: 'kg', threshold: 10 },
  { name: 'Tiger Prawns', category: 'fish', unit: 'kg', threshold: 8 },
  { name: 'Oysters', category: 'fish', unit: 'dozen', threshold: 20 },
  { name: 'Eye Fillet', category: 'meat', unit: 'kg', threshold: 12 },
  { name: 'Chicken Breast', category: 'meat', unit: 'kg', threshold: 20 },
  { name: 'Wagyu Striploin', category: 'meat', unit: 'kg', threshold: 6 },
  { name: 'Lamb Cutlets', category: 'meat', unit: 'kg', threshold: 8 },
  { name: 'Full Cream Milk', category: 'dairy', unit: 'L', threshold: 30 },
  { name: 'Thickened Cream', category: 'dairy', unit: 'L', threshold: 15 },
  { name: 'Unsalted Butter', category: 'dairy', unit: 'kg', threshold: 10 },
  { name: 'Cherry Tomatoes', category: 'produce', unit: 'kg', threshold: 10 },
  { name: 'Baby Spinach', category: 'produce', unit: 'kg', threshold: 5 },
  { name: 'Avocado', category: 'produce', unit: 'each', threshold: 24 },
]

function addDays(d: number) {
  const date = new Date()
  date.setDate(date.getDate() + d)
  return date.toISOString().split('T')[0]
}

const inventoryData = [
  { name: 'Atlantic Salmon',  qty: 8,   expiry: addDays(3),  loc: 'chiller-1' }, // expiring + low stock
  { name: 'Barramundi',       qty: 22,  expiry: addDays(5),  loc: 'chiller-1' }, // expiring
  { name: 'Tiger Prawns',     qty: 5,   expiry: addDays(14), loc: 'freezer-1' }, // low stock
  { name: 'Oysters',          qty: 36,  expiry: addDays(2),  loc: 'chiller-1' }, // expiring (critical)
  { name: 'Eye Fillet',       qty: 18,  expiry: addDays(7),  loc: 'chiller-2' }, // expiring boundary
  { name: 'Chicken Breast',   qty: 45,  expiry: addDays(10), loc: 'chiller-2' },
  { name: 'Wagyu Striploin',  qty: 4,   expiry: addDays(6),  loc: 'freezer-2' }, // both
  { name: 'Lamb Cutlets',     qty: 14,  expiry: addDays(9),  loc: 'chiller-2' },
  { name: 'Full Cream Milk',  qty: 20,  expiry: addDays(4),  loc: 'zone-a' },    // both
  { name: 'Thickened Cream',  qty: 18,  expiry: addDays(12), loc: 'zone-a' },
  { name: 'Unsalted Butter',  qty: 12,  expiry: addDays(21), loc: 'zone-b' },
  { name: 'Cherry Tomatoes',  qty: 6,   expiry: addDays(3),  loc: 'zone-c' },    // both
  { name: 'Baby Spinach',     qty: 3,   expiry: addDays(2),  loc: 'zone-c' },    // both
  { name: 'Avocado',          qty: 48,  expiry: addDays(8),  loc: 'zone-c' },
]

async function seed() {
  console.log('Seeding products...')
  for (const p of products) {
    await sql`
      INSERT INTO products (name, category, unit, reorder_threshold)
      VALUES (${p.name}, ${p.category}, ${p.unit}, ${p.threshold})
      ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        reorder_threshold = EXCLUDED.reorder_threshold
    `
  }

  console.log('Seeding inventory...')
  for (const item of inventoryData) {
    const [product] = await sql`SELECT id FROM products WHERE name = ${item.name}`
    if (!product) { console.warn(`Product not found: ${item.name}`); continue }
    await sql`
      INSERT INTO inventory (product_id, quantity, expiry_date, location)
      VALUES (${product.id}::uuid, ${item.qty}, ${item.expiry}::date, ${item.loc})
    `
  }

  console.log(`Seed complete — ${products.length} products, ${inventoryData.length} inventory items.`)
}

seed().catch((e) => { console.error(e); process.exit(1) })

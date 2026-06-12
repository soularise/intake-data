import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const postgres = (await import('postgres')).default

// Direct connection required for DDL (pooler doesn't support it)
const parsed = new URL(process.env.DATABASE_URL)
const url = `postgresql://postgres:${parsed.password}@db.okenspgfpypiyamniczw.supabase.co:5432/postgres`
const sql = postgres(url, { max: 1, ssl: 'require' })

const migration = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../drizzle/0000_graceful_moira_mactaggert.sql'),
  'utf8'
)

const statements = migration.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)

console.log(`Running ${statements.length} statements...`)
for (const stmt of statements) {
  console.log(`  ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`)
  await sql.unsafe(stmt)
}

await sql.end()
console.log('Migration complete.')

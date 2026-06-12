import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Session pooler (port 5432) required for DDL — Transaction pooler (6543) doesn't support it
    url: process.env.DATABASE_URL!.replace(':6543/', ':5432/'),
  },
})

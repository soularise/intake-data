export function getMigrationDatabaseUrl() {
  if (process.env.DIRECT_DATABASE_URL) return process.env.DIRECT_DATABASE_URL

  const runtimeUrl = process.env.DATABASE_URL
  if (!runtimeUrl) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL is required')
  }

  const parsed = new URL(runtimeUrl)
  if (!parsed.hostname.includes('pooler.supabase.com')) {
    return runtimeUrl
  }

  const usernameParts = decodeURIComponent(parsed.username).split('.')
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? usernameParts[1]
  if (!projectRef) {
    throw new Error('SUPABASE_PROJECT_REF is required when DATABASE_URL uses the Supabase pooler')
  }

  return `postgresql://postgres:${parsed.password}@db.${projectRef}.supabase.co:5432/postgres`
}

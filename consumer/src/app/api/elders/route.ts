import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { elders } from '@/lib/db/schema'
import { generateUniqueEmail } from '@/lib/elders'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, relationship } = body as { name?: string; relationship?: string }

  const uniqueEmail = generateUniqueEmail(name ?? '')

  const [elder] = await db.insert(elders).values({
    userId: session.user.id,
    name: name ?? null,
    relationship: relationship ?? null,
    uniqueEmail,
  }).returning()

  return NextResponse.json({ elder })
}

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(elders).where(
    and(eq(elders.userId, session.user.id), eq(elders.isActive, true))
  )

  return NextResponse.json({ elders: rows })
}

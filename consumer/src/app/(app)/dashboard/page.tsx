import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { consumerExceptions, consumerDocuments, elders } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const userElders = await db.select().from(elders).where(
    and(eq(elders.userId, session.user.id), eq(elders.isActive, true))
  )

  const elderIds = userElders.map((e) => e.id)
  const elderMap = Object.fromEntries(userElders.map((e) => [e.id, e]))

  const openExceptions = elderIds.length > 0
    ? await db
        .select({
          id: consumerExceptions.id,
          signalType: consumerExceptions.signalType,
          severity: consumerExceptions.severity,
          description: consumerExceptions.description,
          elderId: consumerExceptions.elderId,
          vendorName: consumerDocuments.vendorName,
          createdAt: consumerExceptions.createdAt,
        })
        .from(consumerExceptions)
        .leftJoin(consumerDocuments, eq(consumerExceptions.documentId, consumerDocuments.id))
        .where(and(
          eq(consumerExceptions.isResolved, false),
          inArray(consumerExceptions.elderId, elderIds),
        ))
        .orderBy(desc(consumerExceptions.createdAt))
        .limit(20)
    : []

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <Link href="/add-elder" className="text-sm text-gray-500 hover:text-gray-900 underline">
          + Add person
        </Link>
      </div>

      {userElders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-4">Add someone to start monitoring their bills.</p>
            <Link href="/add-elder" className="text-sm font-medium underline text-gray-900">
              Add your first person →
            </Link>
          </CardContent>
        </Card>
      ) : openExceptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            All caught up — no exceptions right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">
            Needs attention ({openExceptions.length})
          </p>
          {openExceptions.map((ex) => {
            const elder = elderMap[ex.elderId]
            return (
              <Card key={ex.id}>
                <CardContent className="py-4 flex items-start gap-3">
                  <Badge variant={ex.severity === 'critical' ? 'destructive' : 'secondary'} className="mt-0.5 shrink-0">
                    {ex.signalType.replace('_', ' ')}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {elder?.name ?? 'Unknown'}{ex.vendorName ? ` — ${ex.vendorName}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">{ex.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {userElders.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">Forwarding addresses</p>
          {userElders.map((elder) => (
            <div key={elder.id} className="text-sm font-mono bg-gray-50 rounded-lg px-4 py-3 text-gray-700">
              <span className="text-gray-400 font-sans text-xs block mb-0.5">{elder.name ?? 'Elder'}</span>
              {elder.uniqueEmail}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import { userProfiles } from './db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing()
        },
      },
    },
  },
})

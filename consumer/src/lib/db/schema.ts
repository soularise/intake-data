import {
  pgTable, uuid, text, boolean, timestamp, date, decimal, jsonb,
} from 'drizzle-orm/pg-core'

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').unique().notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionStatus: text('subscription_status').default('trial').notNull(),
  trialEndDate: timestamp('trial_end_date', { withTimezone: true }),
  documentsProcessed: decimal('documents_processed', { precision: 10, scale: 0 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const elders = pgTable('elders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name'),
  relationship: text('relationship'),
  uniqueEmail: text('unique_email').unique().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const consumerDocuments = pgTable('consumer_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  elderId: uuid('elder_id').references(() => elders.id).notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type'),
  extractedFields: jsonb('extracted_fields'),
  exceptionFlags: jsonb('exception_flags'),
  documentDate: date('document_date'),
  vendorName: text('vendor_name'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  dueDate: date('due_date'),
  status: text('status').default('processed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const consumerExceptions = pgTable('consumer_exceptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => consumerDocuments.id).notNull(),
  elderId: uuid('elder_id').references(() => elders.id).notNull(),
  signalType: text('signal_type').notNull(),
  severity: text('severity').default('info').notNull(),
  description: text('description'),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Elder = typeof elders.$inferSelect
export type NewElder = typeof elders.$inferInsert
export type ConsumerDocument = typeof consumerDocuments.$inferSelect
export type ConsumerException = typeof consumerExceptions.$inferSelect

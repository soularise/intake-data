import { randomUUID } from 'crypto'
import { db } from './db'
import { consumerDocuments, consumerExceptions } from './db/schema'
import { callExtractionService } from './extraction'
import { detectExceptions } from './exceptions'
import { uploadDocument } from './storage'

interface ProcessDocumentInput {
  elderId: string
  buffer: Buffer
  mimeType: string
  filename: string
}

export async function processDocument({ elderId, buffer, mimeType }: ProcessDocumentInput) {
  const documentId = randomUUID()

  const filePath = await uploadDocument(buffer, elderId, documentId, mimeType)
  const documentB64 = buffer.toString('base64')
  const extracted = await callExtractionService(documentB64, mimeType)
  const exceptions = detectExceptions(extracted)

  const [savedDoc] = await db.insert(consumerDocuments).values({
    id: documentId,
    elderId,
    filePath,
    mimeType,
    extractedFields: extracted as unknown as Record<string, unknown>,
    exceptionFlags: exceptions as unknown as Record<string, unknown>,
    vendorName: extracted.vendor_name,
    amount: extracted.amount?.toString() ?? null,
    dueDate: extracted.due_date,
    documentDate: extracted.document_date,
    status: exceptions.length > 0 ? 'flagged' : 'processed',
  }).returning()

  if (exceptions.length > 0) {
    await db.insert(consumerExceptions).values(
      exceptions.map((e) => ({
        documentId: savedDoc.id,
        elderId,
        signalType: e.signalType,
        severity: e.severity,
        description: e.description,
      }))
    )
  }

  return { document: savedDoc, exceptions }
}

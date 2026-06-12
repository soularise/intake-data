import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../extraction', () => ({
  callExtractionService: vi.fn().mockResolvedValue({
    vendor_name: 'PG&E',
    document_type: 'utility_bill',
    amount: 147.50,
    due_date: '2026-06-01',
    document_date: '2026-05-15',
    account_number: '99999',
    is_overdue: true,
    is_final_notice: false,
    has_urgent_language: false,
    prior_amount: null,
    raw_text: 'Your bill is past due.',
  }),
}))

vi.mock('../storage', () => ({
  uploadDocument: vi.fn().mockResolvedValue('elder-id/doc-id.pdf'),
}))

const mockReturning = vi.fn().mockResolvedValue([{ id: 'doc-id', elderId: 'elder-id' }])
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

vi.mock('../db', () => ({
  db: {
    insert: mockInsert,
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('processDocument', () => {
  it('returns exceptions for an overdue document', async () => {
    const { processDocument } = await import('../pipeline')
    const result = await processDocument({
      elderId: 'elder-id',
      buffer: Buffer.from('fake pdf'),
      mimeType: 'application/pdf',
      filename: 'bill.pdf',
    })
    expect(result.exceptions).toContainEqual(
      expect.objectContaining({ signalType: 'overdue' })
    )
  })

  it('calls uploadDocument with correct elderId', async () => {
    const { uploadDocument } = await import('../storage')
    const { processDocument } = await import('../pipeline')
    await processDocument({
      elderId: 'elder-id',
      buffer: Buffer.from('fake pdf'),
      mimeType: 'application/pdf',
      filename: 'bill.pdf',
    })
    expect(uploadDocument).toHaveBeenCalledWith(
      expect.any(Buffer),
      'elder-id',
      expect.any(String),
      'application/pdf',
    )
  })

  it('inserts exception rows when exceptions are found', async () => {
    const { processDocument } = await import('../pipeline')
    await processDocument({
      elderId: 'elder-id',
      buffer: Buffer.from('fake pdf'),
      mimeType: 'application/pdf',
      filename: 'bill.pdf',
    })
    // One insert for the document, one for exceptions
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })
})

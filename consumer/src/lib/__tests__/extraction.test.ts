import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => vi.resetAllMocks())

describe('callExtractionService', () => {
  it('throws on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"error":"bad request"}', { status: 400 })
    )
    const { callExtractionService } = await import('../extraction')
    await expect(
      callExtractionService('base64data', 'image/jpeg')
    ).rejects.toThrow('Extraction service error: 400')
  })

  it('returns parsed data on success', async () => {
    const mockResult = { vendor_name: 'PG&E', amount: 100, is_overdue: false }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: mockResult }), { status: 200 })
    )
    const { callExtractionService } = await import('../extraction')
    const result = await callExtractionService('base64data', 'image/jpeg')
    expect(result.vendor_name).toBe('PG&E')
  })
})

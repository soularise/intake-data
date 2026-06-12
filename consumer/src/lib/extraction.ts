import type { ExtractionResult } from './exceptions'

export async function callExtractionService(
  documentB64: string,
  mimeType: string,
): Promise<ExtractionResult> {
  const url = `${process.env.EXTRACTION_API_URL}/extract/consumer-bill`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.EXTRACTION_API_KEY!,
    },
    body: JSON.stringify({ file: documentB64, mime_type: mimeType }),
  })
  if (!res.ok) throw new Error(`Extraction service error: ${res.status}`)
  const json = await res.json()
  return json.data as ExtractionResult
}

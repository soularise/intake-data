import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function uploadDocument(
  buffer: Buffer,
  elderId: string,
  documentId: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
  const path = `${elderId}/${documentId}.${ext}`

  const { error } = await supabase.storage
    .from('consumer-documents')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

export async function getDocumentUrl(filePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('consumer-documents')
    .createSignedUrl(filePath, 3600)
  if (!data) throw new Error('Failed to create signed URL')
  return data.signedUrl
}

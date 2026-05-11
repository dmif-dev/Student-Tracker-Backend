// backend/src/lib/supabaseStorage.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prefer service key for full storage access, fall back to anon key
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is missing');
}
if (!process.env.SUPABASE_SERVICE_KEY?.trim()) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not set — using anon key for storage. Uploads may fail if bucket policies are restrictive.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export const STORAGE_BUCKET = 'documents';

/**
 * Upload a file buffer to Supabase Storage
 * Returns the storage path for the file
 */
export async function uploadToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${timestamp}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }

  return data.path;
}

/**
 * Download a file from Supabase Storage as a Buffer
 */
export async function downloadFromSupabase(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Supabase storage download failed: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabase(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Supabase storage delete failed: ${error.message}`);
  }
}

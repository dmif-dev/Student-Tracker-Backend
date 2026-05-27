// backend/src/lib/supabaseStorage.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
  mimeType: string,
  bucket: string = STORAGE_BUCKET
): Promise<string> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${timestamp}-${safeName}`;

  // Fallback to local storage if service key is missing
  if (!process.env.SUPABASE_SERVICE_KEY?.trim()) {
    console.warn('⚠️ SUPABASE_SERVICE_KEY not set — falling back to local disk storage.');
    const localDir = path.resolve('uploads');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localFilePath = path.join(localDir, `${timestamp}-${safeName}`);
    fs.writeFileSync(localFilePath, fileBuffer);
    console.log('✅ Saved file locally to:', localFilePath);
    return storagePath;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
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
export async function downloadFromSupabase(storagePath: string, bucket: string = STORAGE_BUCKET): Promise<Buffer> {
  // Fallback to local storage download if service key is missing
  if (!process.env.SUPABASE_SERVICE_KEY?.trim()) {
    console.warn('⚠️ SUPABASE_SERVICE_KEY not set — falling back to local disk download.');
    const parts = storagePath.split('/');
    const fileName = parts[parts.length - 1];
    const localFilePath = path.resolve('uploads', fileName);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
    throw new Error(`Local file not found: ${localFilePath}`);
  }
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
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
export async function deleteFromSupabase(storagePath: string, bucket: string = STORAGE_BUCKET): Promise<void> {
  // Fallback to local storage delete if service key is missing
  if (!process.env.SUPABASE_SERVICE_KEY?.trim()) {
    console.warn('⚠️ SUPABASE_SERVICE_KEY not set — falling back to local disk delete.');
    const parts = storagePath.split('/');
    const fileName = parts[parts.length - 1];
    const localFilePath = path.resolve('uploads', fileName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log('✅ Deleted local file:', localFilePath);
      return;
    }
    console.warn('Local file to delete did not exist:', localFilePath);
    return;
  }
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Supabase storage delete failed: ${error.message}`);
  }
}

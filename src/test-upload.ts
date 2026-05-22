import 'dotenv/config';
import { uploadToSupabase } from './lib/supabaseStorage.js';

async function testUpload() {
  console.log('Testing uploadToSupabase...');

  try {
    const fileBuffer = Buffer.from('Hello world from test script');
    const fileName = 'test_upload_from_script.txt';
    const mimeType = 'text/plain';

    console.log('Attempting upload via uploadToSupabase...');
    const path = await uploadToSupabase(fileBuffer, fileName, mimeType);

    console.log('✅ uploadToSupabase returned path:', path);
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

testUpload();

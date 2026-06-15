import { uploadToSupabase } from './src/lib/supabaseStorage.js';

async function test() {
  try {
    const buffer = Buffer.from('hello world');
    const url = await uploadToSupabase(buffer, 'test.txt', 'text/plain');
    console.log('Success:', url);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();

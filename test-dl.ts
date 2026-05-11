import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function test() {
  const { data, error } = await supabaseAdmin.storage.from('documents').list('uploads');
  console.log('List uploads:', data, error);
  if (data && data.length > 0) {
    const file = data[0];
    console.log('Attempting to download:', `uploads/${file.name}`);
    const { data: dlData, error: dlError } = await supabaseAdmin.storage
      .from('documents')
      .download(`uploads/${file.name}`);
    console.log('Download result:', !!dlData, dlError);
    if (dlData) {
        console.log('data type:', typeof dlData, dlData.constructor.name);
        try {
            const ab = await dlData.arrayBuffer();
            const b = Buffer.from(ab);
            console.log('Buffer converted successfully, size:', b.length);
        } catch (e) {
            console.error('Buffer conversion failed:', e);
        }
    }
  }
}
test();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/"/g, '');
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = value;
    if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching delegation tasks...");
  const { data, error } = await supabase
    .from('delegation')
    .select('*')
    .or('submission_date.is.null,status.neq.done')
    .order('planned_date', { ascending: true });
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Total pending tasks:", data.length);
    console.log("Sample task:", data[0]);
  }
}

test();

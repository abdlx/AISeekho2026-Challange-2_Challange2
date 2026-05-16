import { createBrowserClient } from '@supabase/ssr';
import { getEnv } from './env';

// Client-side Supabase client (Safe for Browser)
// Keys are read lazily inside the function to ensure window._env_ is populated
// by the time this is called (critical for Cloud Run runtime injection).
export const createClient = () => {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

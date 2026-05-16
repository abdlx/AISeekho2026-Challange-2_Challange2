import { createBrowserClient } from '@supabase/ssr';
import { getEnv } from './env';

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Client-side Supabase client (Safe for Browser)
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);

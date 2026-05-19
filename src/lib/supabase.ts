import { createBrowserClient } from '@supabase/ssr';

interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapsApiKey: string;
  googleClientId: string;
  androidClientId: string;
}

let cachedConfig: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

/**
 * Fetches config from the server-side /api/config endpoint.
 * Result is cached globally so it only fetches once per page load.
 * This is the reliable solution for Cloud Run where NEXT_PUBLIC_ vars
 * are not available at Docker build time.
 */
export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = fetch('/api/config')
    .then((r) => r.json())
    .then((data) => {
      cachedConfig = data as AppConfig;
      return cachedConfig;
    });

  return configPromise;
}

/** Returns a Supabase browser client initialized with runtime config. */
export async function createClientAsync() {
  const { supabaseUrl, supabaseAnonKey } = await getConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

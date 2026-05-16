import { NextResponse } from 'next/server';

/**
 * Public config endpoint — exposes NEXT_PUBLIC_ env vars from the server.
 * This is the reliable approach for Cloud Run where vars are injected at
 * runtime (not baked into the Docker image at build time).
 */
export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    mapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });
}

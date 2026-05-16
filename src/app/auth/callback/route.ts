import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Build the public-facing base URL — Cloud Run's internal origin is 0.0.0.0:8080,
  // so we reconstruct from the forwarded headers that Cloud Run always sets.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const publicOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${publicOrigin}${next}`);
    }
    // If exchange failed, show the actual error instead of a generic page
    console.error('[Auth Callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(
      `${publicOrigin}/?login_error=${encodeURIComponent(error.message)}`
    );
  }

  // No code present at all
  return NextResponse.redirect(
    `${publicOrigin}/?login_error=${encodeURIComponent('No authorization code received from Google.')}`
  );
}

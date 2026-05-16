import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const CLOUD_RUN_URL = 'https://aiseekho-ch-2-phase-2-835282333422.europe-west1.run.app';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${CLOUD_RUN_URL}${next}`);
    }
  }

  return NextResponse.redirect(`${CLOUD_RUN_URL}/auth/auth-code-error`);
}

'use client';

import { createClientAsync } from '@/lib/supabase';

const CLOUD_RUN_URL = 'https://aiseekho-ch-2-phase-2-835282333422.europe-west1.run.app';

export async function signInWithGoogle() {
  const supabase = await createClientAsync();

  // Always redirect to the Cloud Run URL — this keeps the flow inside
  // the Capacitor WebView since the app loads from the same origin.
  const redirectTo = `${CLOUD_RUN_URL}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(`Google sign-in failed: ${error.message}`);
  }
}

export async function signOut() {
  const supabase = await createClientAsync();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
  window.location.reload();
}

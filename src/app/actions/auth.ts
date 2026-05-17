'use client';

import { createClientAsync } from '@/lib/supabase';

export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = await createClientAsync();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function signUpWithEmailPassword(email: string, password: string, fullName?: string) {
  const supabase = await createClientAsync();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function signOut() {
  const supabase = await createClientAsync();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }

  // For web/WebView, reload to clear state
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}


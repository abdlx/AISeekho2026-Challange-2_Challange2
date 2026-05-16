'use client';

import { createClientAsync } from '@/lib/supabase';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export async function signInWithGoogle() {
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const supabase = await createClientAsync();

  if (isCapacitor) {
    try {
      await GoogleAuth.initialize();
      const googleUser = await GoogleAuth.signIn();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
      });
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
    }
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error.message);
      throw error;
    }
  }
}

export async function signOut() {
  const supabase = await createClientAsync();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
  window.location.reload();
}

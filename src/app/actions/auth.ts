'use client';

import { createClientAsync } from '@/lib/supabase';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export async function signInWithGoogle() {
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const supabase = await createClientAsync();

  if (isCapacitor) {
    try {
      // Fetch client ID at runtime from our server — env vars in capacitor.config.ts
      // are evaluated at sync time and will always be empty in Cloud Run.
      const config = await fetch('/api/config').then(r => r.json());
      const clientId = config.androidClientId || config.googleClientId;

      if (!clientId) {
        throw new Error('Google Client ID is not configured on the server.');
      }

      await GoogleAuth.initialize({ clientId, scopes: ['profile', 'email'], grantOfflineAccess: true });
      const googleUser = await GoogleAuth.signIn();
      const { error } = await supabase.auth.signInWithIdToken({
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

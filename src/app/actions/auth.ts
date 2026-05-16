'use client';

import { createClientAsync, getConfig } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const CLOUD_RUN_URL = 'https://aiseekho-ch-2-phase-2-835282333422.europe-west1.run.app';

export async function signInWithGoogle() {
  const supabase = await createClientAsync();
  const config = await getConfig();

  // If running on Android/iOS, use the native Google Auth plugin
  // This keeps the flow inside the app and avoids browser redirects.
  if (Capacitor.isNativePlatform()) {
    try {
      // Ensure plugin is initialized with the correct client ID
      await GoogleAuth.initialize({
        clientId: config.androidClientId || config.googleClientId,
      });
      
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Native Google Sign-In failed:', err);
      // We throw here so the UI can show the error
      throw new Error(`Mobile sign-in failed: ${err.message || 'Check your Google Play Services'}`);
    }
  }

  // Fallback/Web flow: Always redirect to the Cloud Run URL
  const redirectTo = `${CLOUD_RUN_URL}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(`Google sign-in failed: ${error.message}`);
  }
}

export async function signOut() {
  const supabase = await createClientAsync();
  
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (err) {
      console.error('Native sign out error:', err);
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
  
  // For web/WebView, reload to clear state
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

'use client';

import { createClientAsync } from '@/lib/supabase';

export async function signInWithGoogle() {
  const supabase = await createClientAsync();
  
  // Detect if running in Capacitor/Native
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const redirectTo = isCapacitor 
    ? 'com.aiseekho.aiso://auth/callback' 
    : `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    throw error;
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

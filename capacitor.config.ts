import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiseekho.aiso',
  appName: 'AISO',
  webDir: 'out',
  server: {
    url: 'https://aiseekho-ch-2-phase-2-835282333422.europe-west1.run.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.NEXT_PUBLIC_ANDROID_CLIENT_ID,
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;


import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiseekho.aiso',
  appName: 'AISO',
  webDir: 'out',
  server: {
    url: 'https://aiseekho-ch-2-phase-2-835282333422.europe-west1.run.app',
    cleartext: true
  }
};

export default config;

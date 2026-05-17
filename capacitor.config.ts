import type { CapacitorConfig } from '@capacitor/cli';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually because Capacitor CLI doesn't load it automatically
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

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


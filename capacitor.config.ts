import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healzy.app',
  appName: 'Healzy',
  webDir: 'dist/hogozaty_/browser',
  server: {
    cleartext: false
  }
};

export default config;
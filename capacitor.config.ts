import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Healzy',
  webDir: 'dist/hogozaty_',
  server: {
    url: 'https://healzy.rossodirect.com:4321',
    cleartext: false
  }
};

export default config;
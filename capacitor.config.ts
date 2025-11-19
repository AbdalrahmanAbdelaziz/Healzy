import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healzy.app',
  appName: 'Healzy',
  webDir: 'dist/hogozaty_/browser',
  server: {
    cleartext: false
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '410166621597-sc6uusdim40vt366k0uvnnsli0c6oqnb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dinner-bell.app',
  appName: 'Dinner Bell',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#242424',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
    },
  },
};

export default config;

import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'UrbanReport',
  slug: 'urbanreport',
  scheme: 'urbanreport',
  version: '1.0.0',
  orientation: 'portrait',
  plugins: ['expo-router', 'expo-secure-store', 'expo-status-bar', 'expo-web-browser', 'expo-font'],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
});

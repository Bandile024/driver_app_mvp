import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Eskort Driver', slug: 'eskort-driver', version: '1.0.0', scheme: 'eskortdriver',
  orientation: 'portrait', userInterfaceStyle: 'automatic', newArchEnabled: true,
  icon: './assets/brand/app-icon.png',
  splash: { image: './assets/brand/app-icon.png', resizeMode: 'contain', backgroundColor: '#FCF9F1' },
  android: { package: 'za.co.eskort.driver', versionCode: 1, adaptiveIcon: { foregroundImage: './assets/brand/app-icon.png', backgroundColor: '#FCF9F1' }, ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}) },
  ios: { bundleIdentifier: 'za.co.eskort.driver', supportsTablet: true, infoPlist: { UIBackgroundModes: ['location', 'processing'], ITSAppUsesNonExemptEncryption: false } },
  web: { bundler: 'metro', output: 'single', favicon: './assets/brand/favicon.png', name: 'Eskort Driver' },
  plugins: ['expo-router', 'expo-font', 'expo-secure-store', 'expo-background-task', ['expo-image-picker', { cameraPermission: 'Take a delivery proof photo.', photosPermission: 'Choose your driver profile photo.', microphonePermission: false }], ['expo-location', { isAndroidBackgroundLocationEnabled: true, isAndroidForegroundServiceEnabled: true, isIosBackgroundLocationEnabled: true, locationAlwaysAndWhenInUsePermission: 'Share your location with dispatch during an active shift.' }], ['expo-notifications', { color: '#F6C000', defaultChannel: 'deliveries' }]],
  owner: 'rblucky',
  extra: { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '4a216e33-27b5-48d7-a93d-f297d5020fc3' } },
};
export default config;

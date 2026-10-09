import fs from 'fs';
import path from 'path';
import type { ExpoConfig } from 'expo/config';

// google-services.json (Android/FCM) só é referenciado se existir no projeto.
const googleServicesPath = './google-services.json';
const hasGoogleServices = fs.existsSync(path.join(__dirname, googleServicesPath));

const config: ExpoConfig = {
  name: 'Chat Firebase',
  slug: 'chat-firebase-rn',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: 'chatfirebase',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'br.com.fiap.chatfirebase',
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'br.com.fiap.chatfirebase',
    ...(hasGoogleServices ? { googleServicesFile: googleServicesPath } : {}),
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: [
    [
      'expo-notifications',
      { color: '#2563EB', defaultChannel: 'messages' },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'O app usa suas fotos para definir a imagem de perfil e do grupo.' },
    ],
  ],
  extra: {
    // Cole aqui o ID mostrado pelo comando "eas init".
    eas: { projectId: process.env.EAS_PROJECT_ID || 'COLE_AQUI_O_EAS_PROJECT_ID' },
  },
};

export default config;

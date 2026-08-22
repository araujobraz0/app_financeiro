import 'dotenv/config';

const variant = process.env.APP_VARIANT ?? 'production';

const isDev = variant === 'development';
const isPreview = variant === 'preview';

const appName = isDev
  ? 'Brazllet Dev'
  : isPreview
  ? 'Brazllet Preview'
  : 'Brazllet';

const androidPackage = isDev
  ? 'com.araujobraz.brazllet.dev'
  : isPreview
  ? 'com.araujobraz.brazllet.preview'
  : 'com.araujobraz.brazllet';

export default {
  expo: {
    name: appName,
    slug: 'brazllet',
    scheme: 'brazllet',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/images/icon.png',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/ce706341-1971-4941-959c-50403153ac49',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-foreground.png',
        backgroundColor: '#0A100D',
      },
    },
    ios: {
      bundleIdentifier: androidPackage,
    },
    web: {
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F8F7F2',
          image: './assets/images/icon-removebg.png',
          imageWidth: 120,
          resizeMode: 'contain',
          dark: {
            backgroundColor: '#0A100D',
            image: './assets/images/icon-removebg.png',
          },
        },
      ],
    ],
    extra: {
      appVariant: variant,
      eas: {
        projectId: 'ce706341-1971-4941-959c-50403153ac49',
      },
    },
  },
};

const GoogleAndroidTestAppId = 'ca-app-pub-3940256099942544~3347511713';

/**
 * Native ad plugin is evaluated during EAS Build, after dependencies are installed. Local Expo Go
 * and web exports remain SDK-free. Production refuses to build with a missing owner-supplied App ID.
 */
module.exports = ({ config }) => {
  if (process.env.EAS_BUILD !== 'true') return config;

  const environment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  const production = environment === 'production';
  const suppliedAppId = process.env.ADMOB_ANDROID_APP_ID?.trim();
  const androidAppId = production ? suppliedAppId : GoogleAndroidTestAppId;

  if (!androidAppId) {
    throw new Error('Production EAS build requires ADMOB_ANDROID_APP_ID.');
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
          },
        },
      ],
      [
        'react-native-google-mobile-ads',
        { androidAppId, delayAppMeasurementInit: true },
      ],
    ],
  };
};

import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, ImageBackground, Text, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from '@expo-google-fonts/poppins/useFonts';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from './src/theme';
import { Screen } from './src/components/layout/Screen';
import { Button } from './src/components/ui/Button';
import { ConfirmModal } from './src/components/feedback/ConfirmModal';
import { useTheme } from './src/theme';
import { ProfileProvider } from './src/context/ProfileContext';
import { CartProvider } from './src/context/CartContext';
import { MarketplaceProvider } from './src/context/MarketplaceContext';
import { ChatProvider } from './src/context/ChatContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { mobileVersionService, type MobileVersionInfo } from './src/services/api/mobileVersion';

const UpdateRequiredScreen: React.FC<{
  versionInfo: MobileVersionInfo;
  checking: boolean;
  onRetry: () => void;
}> = ({ versionInfo, checking, onRetry }) => {
  const { colors, spacing, typography, radius } = useTheme();
  const latestLabel =
    versionInfo.latestVersion || versionInfo.latestBuildNumber
      ? `${versionInfo.latestVersion ?? 'Yeni sürüm'}${versionInfo.latestBuildNumber ? ` • Build ${versionInfo.latestBuildNumber}` : ''}`
      : null;

  return (
    <Screen backgroundColor="#231022">
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.lg,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.xl,
          }}
        >
          <Text style={[typography.h3, { color: '#FFFFFF', textAlign: 'center' }]}>
            Güncelleme gerekli
          </Text>
          <Text
            style={[
              typography.body,
              { color: '#D1D5DB', textAlign: 'center', marginTop: spacing.md, lineHeight: 24 },
            ]}
          >
            Uygulama sürümünüz minimum desteklenen sürümden daha eski. Devam etmek için lütfen güncelleme yapınız.
          </Text>
          <View
            style={{
              marginTop: spacing.lg,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: radius.lg,
              padding: spacing.lg,
            }}
          >
            <Text style={[typography.caption, { color: '#9CA3AF' }]}>
              Mevcut sürüm: {versionInfo.currentVersion}
            </Text>
            {versionInfo.minimumSupportedVersion ? (
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 6 }]}>
                Minimum desteklenen: {versionInfo.minimumSupportedVersion}
              </Text>
            ) : null}
            {latestLabel ? (
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 6 }]}>
                Güncel sürüm: {latestLabel}
              </Text>
            ) : null}
          </View>
          {versionInfo.updateUrl ? (
            <Button
              title="Güncellemeyi Aç"
              onPress={() => {
                void Linking.openURL(versionInfo.updateUrl!);
              }}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          ) : null}
          <Button
            title="Tekrar Dene"
            onPress={onRetry}
            loading={checking}
            variant={versionInfo.updateUrl ? 'outline' : 'primary'}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    </Screen>
  );
};

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [initialRouteName, setInitialRouteName] = useState<'Auth' | 'App' | null>(null);
  const [versionCheckLoading, setVersionCheckLoading] = useState(false);
  const [requiredVersionInfo, setRequiredVersionInfo] = useState<MobileVersionInfo | null>(null);
  const [availableUpdateInfo, setAvailableUpdateInfo] = useState<MobileVersionInfo | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    import('./src/services/notifications')
      .then((mod) => mod.setupNotificationHandler())
      .catch(() => {});
  }, []);

  const checkAppVersion = useCallback(async () => {
    if (!mobileVersionService.hasConfig()) {
      setRequiredVersionInfo(null);
      setAvailableUpdateInfo(null);
      return;
    }

    setVersionCheckLoading(true);
    try {
      const info = await mobileVersionService.getVersionInfo();
      setRequiredVersionInfo(info?.forceUpdate ? info : null);
      setAvailableUpdateInfo(info && !info.forceUpdate && info.hasUpdateAvailable ? info : null);
    } catch {
      setRequiredVersionInfo(null);
      setAvailableUpdateInfo(null);
    } finally {
      setVersionCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAppVersion();
  }, [checkAppVersion]);

  useEffect(() => {
    let cancelled = false;

    import('./src/services/storage')
      .then(async ({ storage }) => {
        const [isLoggedIn, accessToken, refreshToken] = await Promise.all([
          storage.isLoggedIn(),
          storage.getAccessToken(),
          storage.getRefreshToken(),
        ]);

        if (!cancelled) {
          setInitialRouteName(isLoggedIn || !!accessToken || !!refreshToken ? 'App' : 'Auth');
        }
      })
      .catch(() => {
        if (!cancelled) setInitialRouteName('Auth');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // En az 3 saniye splash kalsın, fontlar yüklenmeden asla kaybolmasın
    const MIN_SPLASH_DURATION = 3000;
    const start = Date.now();

    let timeout: NodeJS.Timeout;

    if (fontsLoaded) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(MIN_SPLASH_DURATION - elapsed, 0);
      timeout = setTimeout(() => {
        setIsSplashVisible(false);
      }, remaining);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [fontsLoaded]);

  if (!fontsLoaded || isSplashVisible || !initialRouteName) {
    return (
      <ImageBackground
        source={require('./assets/splash.png')}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        resizeMode="cover"
      >
        {!fontsLoaded && (
          <View
            style={{
              position: 'absolute',
              bottom: 40,
            }}
          >
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </ImageBackground>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {requiredVersionInfo ? (
            <UpdateRequiredScreen
              versionInfo={requiredVersionInfo}
              checking={versionCheckLoading}
              onRetry={() => {
                void checkAppVersion();
              }}
            />
          ) : (
            <>
              <ProfileProvider>
                <CartProvider>
                  <MarketplaceProvider>
                    <ChatProvider>
                      <NavigationContainer>
                        <RootNavigator initialRouteName={initialRouteName} />
                      </NavigationContainer>
                    </ChatProvider>
                  </MarketplaceProvider>
                </CartProvider>
              </ProfileProvider>
              <ConfirmModal
                visible={!!availableUpdateInfo}
                title="Yeni sürüm mevcut"
                message={
                  availableUpdateInfo
                    ? `Uygulamanın daha yeni bir sürümü var. Mevcut sürümünüz ${availableUpdateInfo.currentVersion}, güncel sürüm ${availableUpdateInfo.latestVersion ?? 'yeni sürüm'}.`
                    : ''
                }
                cancelLabel="Daha Sonra"
                confirmLabel={availableUpdateInfo?.updateUrl ? 'Güncelle' : 'Tamam'}
                onCancel={() => setAvailableUpdateInfo(null)}
                onConfirm={() => {
                  const targetUrl = availableUpdateInfo?.updateUrl;
                  setAvailableUpdateInfo(null);
                  if (targetUrl) {
                    void Linking.openURL(targetUrl);
                  }
                }}
              />
            </>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

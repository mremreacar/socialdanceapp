import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, ImageBackground } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from '@expo-google-fonts/poppins/useFonts';
import { Poppins_300Light, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { ThemeProvider } from './src/theme';
import { ProfileProvider } from './src/context/ProfileContext';
import { CartProvider } from './src/context/CartContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_700Bold,
  });

  useEffect(() => {
    import('./src/services/notifications')
      .then((mod) => mod.setupNotificationHandler())
      .catch(() => {});
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

  if (!fontsLoaded || isSplashVisible) {
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
          <ProfileProvider>
            <CartProvider>
              <NavigationContainer>
                <RootNavigator initialRouteName="Auth" />
              </NavigationContainer>
            </CartProvider>
          </ProfileProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

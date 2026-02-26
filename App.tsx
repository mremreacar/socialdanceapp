import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme';
import { ProfileProvider } from './src/context/ProfileContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { storage } from './src/services/storage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    storage.isLoggedIn().then(setIsLoggedIn);
  }, []);

  useEffect(() => {
    import('./src/services/notifications')
      .then((mod) => mod.setupNotificationHandler())
      .catch(() => {});
  }, []);

  if (isLoggedIn === null) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ProfileProvider>
            <NavigationContainer>
              <RootNavigator initialRouteName={isLoggedIn ? 'App' : 'Auth'} />
            </NavigationContainer>
          </ProfileProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

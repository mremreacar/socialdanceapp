import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthStack } from './AuthStack';
import { DrawerNavigator } from './DrawerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

type InitialRoute = 'Auth' | 'App';

export const RootNavigator: React.FC<{ initialRouteName?: InitialRoute }> = ({ initialRouteName = 'Auth' }) => {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="App" component={DrawerNavigator} />
    </Stack.Navigator>
  );
};

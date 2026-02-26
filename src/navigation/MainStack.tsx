import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';
import { EventDetailsScreen } from '../screens/events/EventDetailsScreen';
import { SchoolDetailsScreen } from '../screens/schools/SchoolDetailsScreen';
import { ClassDetailsScreen } from '../screens/events/ClassDetailsScreen';
import { DanceQueenScreen } from '../screens/dance/DanceQueenScreen';
import { EditEventScreen } from '../screens/events/EditEventScreen';
import { EditClassScreen } from '../screens/dance/EditClassScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatDetailScreen } from '../screens/chat/ChatDetailScreen';
import { NewChatScreen } from '../screens/chat/NewChatScreen';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { AddProductScreen } from '../screens/marketplace/AddProductScreen';
import { ProductDetailScreen } from '../screens/marketplace/ProductDetailScreen';
import { SettingsScreen } from '../screens/social/SettingsScreen';
import { EditProfileScreen } from '../screens/social/EditProfileScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} />
      <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} />
      <Stack.Screen name="DanceQueen" component={DanceQueenScreen} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} />
      <Stack.Screen name="EditClass" component={EditClassScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};

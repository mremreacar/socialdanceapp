import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';
import { EventDetailsScreen } from '../screens/events/EventDetailsScreen';
import { SchoolDetailsScreen } from '../screens/schools/SchoolDetailsScreen';
import { ClassDetailsScreen } from '../screens/events/ClassDetailsScreen';
import { DanceStarScreen } from '../screens/dance/DanceStarScreen';
import { EditEventScreen } from '../screens/events/EditEventScreen';
import { EditClassScreen } from '../screens/dance/EditClassScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatDetailScreen } from '../screens/chat/ChatDetailScreen';
import { NewChatScreen } from '../screens/chat/NewChatScreen';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { CartScreen } from '../screens/marketplace/CartScreen';
import { AddProductScreen } from '../screens/marketplace/AddProductScreen';
import { ProductDetailScreen } from '../screens/marketplace/ProductDetailScreen';
import { SettingsScreen } from '../screens/social/SettingsScreen';
import { EditProfileScreen } from '../screens/social/EditProfileScreen';
import { NotificationsScreen } from '../screens/social/NotificationsScreen';
import { SettingsPasswordScreen } from '../screens/social/SettingsPasswordScreen';
import { SettingsPaymentsScreen } from '../screens/social/SettingsPaymentsScreen';
import { SettingsHelpScreen } from '../screens/social/SettingsHelpScreen';
import { SettingsAboutScreen } from '../screens/social/SettingsAboutScreen';
import { BlockedUsersScreen } from '../screens/social/BlockedUsersScreen';
import { ViewUserProfileScreen } from '../screens/social/ViewUserProfileScreen';
import { FavoriteSchoolsScreen } from '../screens/social/FavoriteSchoolsScreen';
import { FavoritesHubScreen } from '../screens/social/FavoritesHubScreen';
import { InstructorOnboardingScreen } from '../screens/instructor/InstructorOnboardingScreen';
import { InstructorsListScreen } from '../screens/explore/InstructorsListScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="SchoolDetails" component={SchoolDetailsScreen} />
      <Stack.Screen name="FavoriteSchools" component={FavoriteSchoolsScreen} />
      <Stack.Screen name="FavoritesHub" component={FavoritesHubScreen} />
      <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} />
      <Stack.Screen name="DanceStar" component={DanceStarScreen} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} />
      <Stack.Screen name="EditClass" component={EditClassScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SettingsPassword" component={SettingsPasswordScreen} />
      <Stack.Screen name="SettingsPayments" component={SettingsPaymentsScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="SettingsHelp" component={SettingsHelpScreen} />
      <Stack.Screen name="SettingsAbout" component={SettingsAboutScreen} />
      <Stack.Screen name="UserProfile" component={ViewUserProfileScreen} />
      <Stack.Screen name="InstructorsList" component={InstructorsListScreen} />
      <Stack.Screen name="InstructorOnboarding" component={InstructorOnboardingScreen} />
    </Stack.Navigator>
  );
};

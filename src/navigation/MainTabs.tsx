import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabsParamList } from '../types/navigation';
import { useTheme } from '../theme';
import { Icon, IconName } from '../components/ui/Icon';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { SchoolsScreen } from '../screens/schools/SchoolsScreen';
import { DancerTrackScreen } from '../screens/dance/DancerTrackScreen';
import { FavoritesScreen } from '../screens/social/FavoritesScreen';
import { ProfileScreen } from '../screens/social/ProfileScreen';
import { LinearGradient } from 'expo-linear-gradient';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const tabIcons: Record<keyof MainTabsParamList, { active: IconName; inactive: IconName }> = {
  Explore: { active: 'compass', inactive: 'compass-outline' },
  Schools: { active: 'school', inactive: 'school-outline' },
  DancerTrack: { active: 'human-female-dance', inactive: 'human-female-dance' },
  Favorites: { active: 'heart', inactive: 'heart-outline' },
  Profile: { active: 'account', inactive: 'account-outline' },
};

const tabLabels: Record<keyof MainTabsParamList, string> = {
  Explore: 'Keşfet',
  Schools: 'Okullar',
  DancerTrack: 'Dans Takip',
  Favorites: 'Favoriler',
  Profile: 'Profil',
};

export const MainTabs: React.FC = () => {
  const { colors, spacing, shadows } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? 25 : spacing.sm,
          ...shadows.md,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconSet = tabIcons[route.name as keyof MainTabsParamList];
          const iconName = focused ? iconSet.active : iconSet.inactive;

          if (route.name === 'DancerTrack') {
            return (
              <View style={styles.centerTabContainer}>
                <LinearGradient
                  colors={[colors.primary, '#a855f7']}
                  style={styles.centerTab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon name={iconName} size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
            );
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
        tabBarLabel: tabLabels[route.name as keyof MainTabsParamList],
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Schools" component={SchoolsScreen} />
      <Tab.Screen name="DancerTrack" component={DancerTrackScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  centerTabContainer: {
    position: 'relative',
    top: -12,
  },
  centerTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

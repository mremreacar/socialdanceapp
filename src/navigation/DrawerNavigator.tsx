import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerParamList } from '../types/navigation';
import { MainStack } from './MainStack';
import { useTheme } from '../theme';
import { useProfile } from '../context/ProfileContext';
import { Icon, IconName } from '../components/ui/Icon';
import { Avatar } from '../components/ui/Avatar';
import { Divider } from '../components/ui/Divider';

interface MenuItem {
  label: string;
  icon: IconName;
  route: string;
  params?: any;
}

const menuItems: MenuItem[] = [
  { label: 'Keşfet', icon: 'compass-outline', route: 'Explore' },
  { label: 'Okullar', icon: 'school-outline', route: 'Schools' },
  { label: 'DanceQueen', icon: 'crown-outline', route: 'DanceQueen' },
  { label: 'Dans Takip', icon: 'human-female-dance', route: 'DancerTrack' },
  { label: 'Etkinlikler', icon: 'calendar-outline', route: 'Explore' },
  { label: 'Profil', icon: 'account-outline', route: 'Profile' },
  { label: 'Marketplace', icon: 'shopping-outline', route: 'Marketplace' },
  { label: 'Mesajlar', icon: 'message-outline', route: 'ChatList' },
];

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();
  const { profile, avatarSource } = useProfile();

  const handleNavigate = (item: MenuItem) => {
    navigation.closeDrawer();
    const tabRoutes = ['Explore', 'Schools', 'DancerTrack', 'Favorites', 'Profile'];
    if (tabRoutes.includes(item.route)) {
      navigation.navigate('Main', {
        screen: 'MainTabs',
        params: { screen: item.route },
      });
    } else {
      navigation.navigate('Main', { screen: item.route, params: item.params });
    }
  };

  const handleLogout = () => {
    navigation.closeDrawer();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' as never }],
    });
  };

  return (
    <View style={[styles.drawer, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left }]}>
      <View style={[styles.drawerHeaderRow, { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}>
        <View style={styles.drawerHeaderLeft}>
          <Avatar
            source={avatarSource}
            size="lg"
            showBorder
          />
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.h3, { color: colors.headerText }]} numberOfLines={1}>{profile.displayName}</Text>
            <Text style={[typography.bodySmall, { color: colors.headerText, opacity: 0.8, marginTop: 2 }]} numberOfLines={1}>@{profile.username}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => navigation.closeDrawer()}
          style={[styles.closeBtn, { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: '#9CA3AF', borderRadius: 100, marginTop: -50 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Divider />

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleNavigate(item)}
            style={[styles.menuItem, { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}
            activeOpacity={0.7}
          >
            <Icon name={item.icon} size={22} color={colors.headerText} />
            <Text style={[typography.bodyMedium, { color: colors.headerText, marginLeft: spacing.lg }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Divider />

      <TouchableOpacity
        onPress={handleLogout}
        style={[styles.menuItem, { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}
        activeOpacity={0.7}
      >
        <Icon name="logout" size={22} color={colors.error} />
        <Text style={[typography.bodyMedium, { color: colors.error, marginLeft: spacing.lg }]}>
          Çıkış Yap
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export const DrawerNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: false,
        drawerStyle: {
          width: 280,
          backgroundColor: colors.background,
        },
        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name="Main" component={MainStack} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    position: 'relative',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerHeaderLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerParamList } from '../types/navigation';
import { MainStack } from './MainStack';
import { useTheme } from '../theme';
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
  const { colors, typography, spacing, radius } = useTheme();

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
    <View style={[styles.drawer, { backgroundColor: colors.surface }]}>
      <View style={[styles.drawerHeader, { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl }]}>
        <Avatar
          source="https://lh3.googleusercontent.com/aida-public/AB6AXuAozkav3nW4pjxxBTZ9r4bnylgPIqCTaCZfeooT-iWfynJKZXgRv-HsTDa3vAtFwVs-S0q_5DxzyefpzHzF9dxop2EIWngyydzbp00sS9RD_GW7EAYzlT5uL0xw7zjOZu4BhH4QjAGHvnjHbl6blJTPQPYsnNb08fT2JwDrOlRZhBHfCqRwlN3GOJq-wj48GfdD3ZyLxdmrkroY0i1ic51l_ssDbmO_cM2bldocE_cHmHuSYfM4JE3Up_oWcyj3HNikmvQ4rUzFrWE"
          size="lg"
          showBorder
        />
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Elif Yılmaz</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>@elifyilmaz</Text>
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
            <Icon name={item.icon} size={22} color={colors.textSecondary} />
            <Text style={[typography.bodyMedium, { color: colors.text, marginLeft: spacing.lg }]}>
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
        drawerType: 'slide',
        drawerStyle: {
          width: 280,
          backgroundColor: colors.surface,
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
  },
  drawerHeader: {
    paddingTop: 60,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

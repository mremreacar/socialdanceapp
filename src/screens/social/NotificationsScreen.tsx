import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type NotificationItem = {
  id: string;
  type: 'event' | 'follow' | 'message' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
  /** Tıklanınca gidilecek ekran bilgisi */
  navigateTo?: { screen: keyof MainStackParamList; params?: object };
};

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'event',
    title: 'Yaklaşan etkinlik',
    body: 'Salsa Gecesi yarın 21:00\'da başlıyor. Katılmayı unutma!',
    time: '2 saat önce',
    read: false,
    navigateTo: { screen: 'EventDetails', params: { id: 'e1' } },
  },
  {
    id: '2',
    type: 'follow',
    title: 'Yeni takipçi',
    body: 'Zeynep Su seni takip etmeye başladı.',
    time: '5 saat önce',
    read: false,
    navigateTo: { screen: 'MainTabs', params: { screen: 'Profile' } },
  },
  {
    id: '3',
    type: 'message',
    title: 'Yeni mesaj',
    body: 'Burak: Bu hafta sonu bachata workshop\'una gidelim mi?',
    time: 'Dün',
    read: true,
    navigateTo: { screen: 'ChatDetail', params: { id: 'c1', name: 'Burak', avatar: 'https://i.pravatar.cc/150?u=burak' } },
  },
  {
    id: '4',
    type: 'system',
    title: 'Hoş geldin!',
    body: 'Socialdance ailesine katıldığın için teşekkürler. Keşfet sekmesinden etkinliklere göz atabilirsin.',
    time: '2 gün önce',
    read: true,
    navigateTo: { screen: 'MainTabs', params: { screen: 'Explore' } },
  },
];

const typeIcon: Record<NotificationItem['type'], string> = {
  event: 'calendar',
  follow: 'account-plus',
  message: 'message-text',
  system: 'information',
};

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius, typography } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteAll = () => {
    Alert.alert('Tümünü sil', 'Tüm bildirimler silinecek. Emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => setNotifications([]) },
    ]);
  };

  const deleteOne = (id: string, e: any) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const onNotificationPress = (item: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    if (item.navigateTo) {
      const { screen, params } = item.navigateTo;
      (navigation.navigate as any)(screen, params);
    }
  };

  const headerRight = (
    <TouchableOpacity
      onPress={deleteAll}
      style={[styles.headerIconBtn, { borderColor: '#9CA3AF', borderRadius: radius.full, borderWidth: 1 }]}
      activeOpacity={0.7}
    >
      <Icon name="delete-outline" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <Screen>
      <Header title="Bildirimler" showBack rightComponent={headerRight} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            style={[styles.markAllReadBtn, { marginBottom: spacing.md }]}
            activeOpacity={0.7}
          >
            <Text style={[typography.label, { color: colors.primary }]}>Tümünü okundu</Text>
          </TouchableOpacity>
        )}
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bell-off-outline" size={48} color="#9CA3AF" />
            <Text style={[typography.bodyMedium, { color: '#9CA3AF', marginTop: spacing.md, textAlign: 'center' }]}>
              Henüz bildirim yok.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onNotificationPress(item)}
              style={[
                styles.card,
                {
                  backgroundColor: item.read ? '#311831' : '#3d1a3d',
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: spacing.lg,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primaryAlpha20 }]}>
                  <Icon name={typeIcon[item.type] as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[typography.caption, { color: '#6B7280', marginTop: spacing.xs }]}>{item.time}</Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => deleteOne(item.id, e)}
                  style={styles.deleteIconWrap}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="delete-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  card: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllReadBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  deleteIconWrap: {
    padding: 4,
    marginLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EE2AEE',
    marginLeft: 8,
    marginTop: 6,
  },
});

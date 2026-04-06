import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { blocksService, type BlockedUserListItem } from '../../services/api/blocks';

function formatBlockedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const BlockedUsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [items, setItems] = useState<BlockedUserListItem[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await blocksService.listBlockedUsers();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onUnblock = (item: BlockedUserListItem) => {
    Alert.alert(
      'Engeli kaldır',
      `${item.name} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyUserId(item.id);
              try {
                await blocksService.unblockUser(item.id);
                setItems((prev) => prev.filter((u) => u.id !== item.id));
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Engel kaldırılamadı.';
                Alert.alert('Hata', msg);
              } finally {
                setBusyUserId(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Engellenen Kişiler" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : items.length === 0 ? (
          <View
            style={{
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.lg,
              alignItems: 'center',
            }}
          >
            <Icon name="block-helper" size={30} color="#9CA3AF" />
            <Text style={[typography.bodyMedium, { color: '#FFFFFF', marginTop: spacing.sm }]}>Henüz engellediğiniz bir kullanıcı yok</Text>
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 6, textAlign: 'center' }]}>
              Engellediğiniz kişiler burada listelenecek.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.cardBorder }}>
            {items.map((item, index) => {
              const isLast = index === items.length - 1;
              const isBusy = busyUserId === item.id;
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    activeOpacity={0.75}
                    onPress={() => (navigation as any).navigate('UserProfile', { userId: item.id, name: item.name, avatar: item.avatar })}
                  >
                    <Avatar source={item.avatar} size="md" />
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {!!item.username && (
                        <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>
                          {item.username}
                        </Text>
                      )}
                      <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
                        Engellendi: {formatBlockedAt(item.blockedAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onUnblock(item)}
                    disabled={isBusy}
                    style={{
                      marginLeft: spacing.md,
                      minWidth: 90,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(248,113,113,0.45)',
                      backgroundColor: 'rgba(248,113,113,0.1)',
                      borderRadius: radius.full,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      opacity: isBusy ? 0.7 : 1,
                    }}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#FCA5A5" />
                    ) : (
                      <Text style={[typography.captionBold, { color: '#FCA5A5' }]}>Engeli kaldır</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

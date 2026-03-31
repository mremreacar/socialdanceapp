import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, ActivityIndicator, RefreshControl, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { UserListItem } from '../../components/domain/UserListItem';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { messageService } from '../../services/api/messages';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type PeerRow = { id: string; name: string; avatar: string; subtitle: string };

function getPeerDisplayName(peer: PeerRow): string {
  const directName = peer.name.trim();
  if (directName) return directName;
  const username = peer.subtitle.replace(/^@/, '').trim();
  if (username) return username;
  return 'Kullanıcı';
}

export const NewChatScreen: React.FC = () => {
  const navigation = useNavigation() as Nav;
  const { spacing, colors, typography } = useTheme();
  const [search, setSearch] = useState('');
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { pull?: boolean }) => {
    if (!hasSupabaseConfig()) {
      setPeers([]);
      setError('Supabase yapılandırması eksik.');
      setLoading(false);
      setListRefreshing(false);
      return;
    }
    if (opts?.pull) {
      setListRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const rows = await messageService.listFollowingPeers();
      setPeers(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Liste yüklenemedi.';
      setError(msg);
      setPeers([]);
    } finally {
      if (opts?.pull) {
        setListRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = peers.filter((u) => {
    if (!normalizedSearch) return true;
    const displayName = getPeerDisplayName(u).toLowerCase();
    return displayName.includes(normalizedSearch) || u.subtitle.toLowerCase().includes(normalizedSearch);
  });

  return (
    <Screen>
      <Header title="Yeni Sohbet" titleColor="#FFFFFF" showBack />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Kişi ara..." backgroundColor="#482347" />
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={() => void load({ pull: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>{error}</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
          alwaysBounceVertical
          overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={() => void load({ pull: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl }]}>
              Gösterilecek kullanıcı bulunamadı.
            </Text>
          }
          renderItem={({ item }) => (
            (() => {
              const displayName = getPeerDisplayName(item);
              const username = item.subtitle.startsWith('@') ? item.subtitle.slice(1).trim() : undefined;
              return (
                <UserListItem
                  name={displayName}
                  subtitle={item.subtitle}
                  avatar={item.avatar}
                  nameColor="#FFFFFF"
                  subtitleColor="rgba(255,255,255,0.75)"
                  onPress={() =>
                    navigation.navigate('UserProfile', {
                      userId: item.id,
                      name: displayName,
                      username: username || undefined,
                      avatar: item.avatar,
                    })
                  }
                  rightLabel="Mesaj"
                  rightVariant="primary"
                  onRightPress={() =>
                    navigation.navigate('ChatDetail', {
                      id: item.id,
                      name: displayName,
                      avatar: item.avatar,
                      isNewChat: true,
                    })
                  }
                />
              );
            })()
          )}
        />
      )}
    </Screen>
  );
};

import React, { useState, useCallback } from 'react';
import { View, FlatList, Text, ActivityIndicator, RefreshControl, ScrollView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { UserListItem } from '../../components/domain/UserListItem';
import { useChats } from '../../context/ChatContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation() as Nav;
  const { spacing, colors, typography } = useTheme();
  const { chats, loading, error, refreshChats } = useChats();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshChats();
    }, [refreshChats]),
  );

  const filtered = chats.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleScroll = useCallback((y: number) => {
    // Pull-down sırasında aramayı görünür yap.
    if (y < -24) {
      setShowSearch(true);
      return;
    }
    if (y >= 0 && !search.trim()) {
      setShowSearch(false);
    }
  }, [search]);

  return (
    <Screen>
      <Header
        title="Mesajlar"
        titleColor="#FFFFFF"
        showBack
        rightIcon="plus"
        onRightPress={() => navigation.navigate('NewChat')}
      />
      {(showSearch || search.trim().length > 0) && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Ara..."
            backgroundColor="#482347"
          />
        </View>
      )}
      {loading && chats.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refreshChats()}
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
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          alwaysBounceVertical
          overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
          refreshControl={
            <RefreshControl
              refreshing={loading && chats.length > 0}
              onRefresh={() => void refreshChats()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl }]}>
              Henüz sohbet yok. Takip ettiklerinden veya bir profilden mesaj göndererek başlayabilirsin.
            </Text>
          }
          renderItem={({ item }) => (
            <UserListItem
              name={item.name}
              subtitle={item.lastMessage}
              avatar={item.avatar}
              timestamp={item.time}
              unreadCount={item.unread}
              showOnline={item.isOnline}
              nameColor="#FFFFFF"
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  conversationId: item.conversationId,
                  id: item.peerId,
                  name: item.name,
                  avatar: item.avatar,
                })
              }
            />
          )}
        />
      )}
    </Screen>
  );
};

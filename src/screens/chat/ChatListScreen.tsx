import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { UserListItem } from '../../components/domain/UserListItem';
import { mockChats } from '../../constants/mockData';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation() as Nav;
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = mockChats.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen>
      <Header
        title="Mesajlar"
        showBack
        rightIcon="plus"
        onRightPress={() => navigation.navigate('NewChat')}
      />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Ara..."
          backgroundColor="#482347"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
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
                id: item.id,
                name: item.name,
                avatar: item.avatar,
              })
            }
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({});

import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { UserListItem } from '../../components/domain/UserListItem';
import { mockFollowing } from '../../constants/mockData';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const NewChatScreen: React.FC = () => {
  const navigation = useNavigation() as Nav;
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = mockFollowing.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen>
      <Header title="Yeni Sohbet" showBack />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Kişi ara..." backgroundColor="#482347" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <UserListItem
            name={item.name}
            subtitle={item.handle}
            avatar={item.img}
            onPress={() =>
              navigation.navigate('ChatDetail', { id: String(item.id), name: item.name, avatar: item.img })
            }
          />
        )}
      />
    </Screen>
  );
};

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { Icon } from '../../components/ui/Icon';
import { mockSchools } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { School } from '../../types/models';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const SchoolsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const filtered = mockSchools.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Screen>
      <Header title="Dans Okulları" showBack={false} showMenu onMenuPress={openDrawer} />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Okul veya konum ara" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((school) => (
          <View key={school.id} style={{ marginBottom: spacing.lg }}>
            <SchoolCard
              school={school as School}
              onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
            />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.fab, { right: spacing.lg, bottom: 100 }]}>
        <TouchableOpacity
          onPress={() => (navigation.getParent() as any)?.navigate('EditClass', {})}
          activeOpacity={0.9}
          style={[styles.fabButton, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  fab: { position: 'absolute', zIndex: 10 },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});

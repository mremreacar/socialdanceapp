import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { FilterBar } from '../../components/domain/FilterBar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const mockProducts = [
  { id: '1', title: 'Salsa Ayakkabısı', price: '₺450', image: 'https://picsum.photos/seed/salsa-shoe/300/200', category: 'Ayakkabı' },
  { id: '2', title: 'Bachata Eteği', price: '₺280', image: 'https://picsum.photos/seed/dance-skirt/300/200', category: 'Kıyafet' },
  { id: '3', title: 'Tango Pabuç', price: '₺520', image: 'https://picsum.photos/seed/tango-shoe/300/200', category: 'Ayakkabı' },
];

const categories = ['Tümü', 'Ayakkabı', 'Kıyafet', 'Aksesuar'];

export const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius, typography } = useTheme();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tümü');

  const filtered = mockProducts.filter(
    (p) =>
      (!search || p.title.toLowerCase().includes(search.toLowerCase())) &&
      (activeCategory === 'Tümü' || p.category === activeCategory)
  );

  return (
    <Screen>
      <Header
        title="Marketplace"
        showBack
        onBackPress={() => navigation.goBack()}
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddProduct')}
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ürün ara..." backgroundColor="#482347" />
        <FilterBar filters={categories} activeFilter={activeCategory} onFilterChange={setActiveCategory} />
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: spacing.md, marginBottom: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.cardBorder }]}
          >
            <Image
              source={{ uri: item.image }}
              style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={200}
            />
            <View style={{ padding: spacing.md }}>
              <Text style={[typography.bodySmallBold, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[typography.bodySmallBold, { color: colors.primary }]}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, maxWidth: '48%', overflow: 'hidden' },
  image: {
    width: '100%',
    height: 140,
  },
});

import React, { useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { FilterBar } from '../../components/domain/FilterBar';
import { Icon } from '../../components/ui/Icon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const mockProducts = [
  { id: '1', title: 'Salsa Ayakkabısı', price: '₺450', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300', category: 'Ayakkabı' },
  { id: '2', title: 'Bachata Eteği', price: '₺280', image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=300', category: 'Kıyafet' },
  { id: '3', title: 'Tango Pabuç', price: '₺520', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300', category: 'Ayakkabı' },
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
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddProduct')}
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ürün ara..." />
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
            <Image source={{ uri: item.image }} style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]} />
            <View style={{ padding: spacing.md }}>
              <Text style={[typography.bodySmallBold, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[typography.bodySmallBold, { color: colors.primary }]}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={[styles.fab, { right: spacing.lg, bottom: 100 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProduct')}
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, maxWidth: '48%', overflow: 'hidden' },
  image: { width: '100%', height: 140, resizeMode: 'cover' },
  fab: { position: 'absolute', zIndex: 10 },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

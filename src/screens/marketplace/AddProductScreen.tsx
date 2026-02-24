import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FilterBar } from '../../components/domain/FilterBar';

const categories = ['Ayakkabı', 'Kıyafet', 'Aksesuar', 'Diğer'];

export const AddProductScreen: React.FC = () => {
  const navigation = useNavigation();
  const { spacing } = useTheme();
  const [category, setCategory] = React.useState('Ayakkabı');

  return (
    <Screen>
      <Header title="Ürün Ekle" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 120, backgroundColor: '#eee', borderRadius: 16, marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
          <Button title="Fotoğraf Ekle" variant="outline" size="sm" onPress={() => {}} icon="camera" />
        </View>
        <Input label="Ürün adı" placeholder="Örn: Salsa ayakkabısı" />
        <View style={{ marginTop: spacing.lg }}>
          <Input label="Fiyat (₺)" placeholder="0" keyboardType="numeric" />
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <FilterBar filters={categories} activeFilter={category} onFilterChange={setCategory} />
        </View>
        <Input label="Açıklama" placeholder="Ürün detayları..." containerStyle={{ marginTop: spacing.lg }} multiline />
        <Button title="Yayınla" onPress={() => navigation.goBack()} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({});

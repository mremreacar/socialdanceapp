import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ExploreSearch'>;
const filters = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];

export const ExploreSearchScreen: React.FC<Props> = ({ navigation, route }) => {
  const { spacing, typography, colors, radius } = useTheme();
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [activeFilter, setActiveFilter] = useState('Tümü');

  return (
    <Screen>
      <Header title="Ara" titleColor="#FFFFFF" showBack />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Etkinlik, mekan veya şehir ara"
          autoFocus
          backgroundColor="#482347"
        />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
          {filters.map((f) => {
            const selected = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radius.full,
                  backgroundColor: selected ? colors.primary : '#311831',
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : 'rgba(255,255,255,0.14)',
                }}
              >
                <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[typography.caption, { color: '#9CA3AF' }]}>
          Aramak istediğiniz etkinlik, mekan veya şehir adını yazın.
        </Text>
      </View>
    </Screen>
  );
};

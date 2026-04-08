import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { useTheme } from '../../theme';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { SchoolCard } from '../../components/domain/SchoolCard';
import type { School } from '../../types/models';
import { MainStackParamList } from '../../types/navigation';
import { listFavoriteSchools } from '../../services/api/favorites';
import type { SchoolRow } from '../../services/api/schools';

type Props = NativeStackScreenProps<MainStackParamList, 'FavoriteSchools'>;

export const FavoriteSchoolsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const [rows, setRows] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listFavoriteSchools();
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Favoriler yüklenemedi');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const schools: School[] = useMemo(() => {
    const list = rows ?? [];
    return list.map((r) => {
      const location = [r.district, r.city].filter(Boolean).join(', ') || r.address || '';
      const image = r.image_url?.trim() || '';
      return {
        id: r.id,
        name: r.name,
        location: location || '—',
        image,
        rating: typeof r.rating === 'number' ? r.rating : 4.7,
        ratingCount: typeof r.review_count === 'number' ? r.review_count : 0,
        phone: r.telephone || undefined,
        website: r.website || undefined,
        latitude: r.latitude ?? undefined,
        longitude: r.longitude ?? undefined,
        tags: r.category ? [r.category] : undefined,
      };
    });
  }, [rows]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  if (rows == null) {
    return <LoadingSpinner fullScreen message="Favoriler yükleniyor..." />;
  }

  return (
    <Screen>
      <Header title="Favoriler" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {schools.length} Okul
        </Text>

        {error ? (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {schools.length ? (
          schools.map((s) => (
            <View key={s.id} style={{ marginBottom: spacing.lg }}>
              <SchoolCard
                school={s}
                onPress={() => navigation.navigate('SchoolDetails', { id: s.id })}
                cardBackgroundColor="#341A32"
              />
            </View>
          ))
        ) : (
          <EmptyState icon="heart-outline" title="Henüz favori okul yok." subtitle="Okul detayından kalp ikonuna basarak favorilerinize ekleyebilirsiniz." />
        )}
      </ScrollView>
    </Screen>
  );
};


import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { EmptyState } from '../../components/feedback/EmptyState';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { ApiError, hasSupabaseConfig } from '../../services/api/apiClient';
import { formatLessonPrice } from '../../services/api/instructorLessons';
import { instructorLessonReservationsService } from '../../services/api/instructorLessonReservations';
import { schoolEventAttendeesService } from '../../services/api/schoolEventAttendees';
import { storage } from '../../services/storage';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

function formatStartsAtLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: '2-digit' });
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase();
}

export const SettingsReservationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<
    {
      id: string;
      kind: 'event' | 'lesson';
      title: string;
      location: string;
      date: string;
      day: string;
      month: string;
      image: string;
      rawDate: Date;
    }[]
  >([]);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setItems([]);
      setLoading(false);
      return;
    }

    const token = await storage.getAccessToken();
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const [eventRows, lessonRows] = await Promise.all([
        schoolEventAttendeesService.listMine(),
        instructorLessonReservationsService.listMine().catch(() => []),
      ]);
      const mappedEvents = eventRows
        .filter((row) => (row.event_type ?? '').trim().toLowerCase() !== 'lesson')
        .map((row) => {
          const rawDate = new Date(row.starts_at);
          if (Number.isNaN(rawDate.getTime())) return null;
          return {
            id: row.id,
            kind: 'event' as const,
            title: row.title?.trim() || 'Etkinlik',
            location: row.location?.trim() || 'Konum yakında açıklanacak',
            date: formatStartsAtLabel(row.starts_at),
            day: formatDay(row.starts_at),
            month: formatMonth(row.starts_at),
            image: row.image_url?.trim() || '',
            rawDate,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const mappedLessons = lessonRows
        .map((row) => {
          const startsAt = row.nextOccurrenceAt ? new Date(row.nextOccurrenceAt) : null;
          if (!startsAt || Number.isNaN(startsAt.getTime())) return null;
          const location = [
            row.schoolName?.trim() || '',
            row.scheduleSummary?.trim() || '',
            [row.schoolDistrict?.trim(), row.schoolCity?.trim()].filter(Boolean).join(', '),
          ]
            .filter(Boolean)
            .join(' · ');
          return {
            id: row.id,
            kind: 'lesson' as const,
            title: row.title?.trim() || 'Ders',
            location: location || 'Konum yakında açıklanacak',
            date: `${formatStartsAtLabel(row.nextOccurrenceAt || '')} · ${formatLessonPrice(row)}`,
            day: formatDay(row.nextOccurrenceAt || ''),
            month: formatMonth(row.nextOccurrenceAt || ''),
            image: row.imageUrl || '',
            rawDate: startsAt,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      const mapped = [...mappedEvents, ...mappedLessons].sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
      setItems(mapped);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Rezervasyonlar yüklenemedi.';
      Alert.alert('Rezervasyonlarım', message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <Screen>
      <Header title="Rezervasyonlarım" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
          />
        }
      >
        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Katıldığınız etkinlikler ve dersler</Text>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>
            Rezervasyon yaptığınız içerikleri burada takip edebilirsiniz.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : items.length === 0 ? (
          <View
            style={{
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.lg,
            }}
          >
            <EmptyState
              icon="calendar-check-outline"
              title="Henüz rezervasyonunuz yok"
              subtitle="Bir etkinliğe veya derse katıldığınızda burada listelenecek."
              actionLabel="Etkinliklere Git"
              onAction={() => navigation.navigate('MainTabs', { screen: 'Favorites' })}
            />
          </View>
        ) : (
          <>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
              {items.length} rezervasyon bulundu
            </Text>
            {items.map((item) => (
              <View key={`${item.kind}:${item.id}`} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={item}
                  onPress={() =>
                    item.kind === 'event'
                      ? navigation.navigate('EventDetails', { id: item.id, fromFavorites: true })
                      : navigation.navigate('ClassDetails', { id: item.id })
                  }
                  hasJoinedReservation
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

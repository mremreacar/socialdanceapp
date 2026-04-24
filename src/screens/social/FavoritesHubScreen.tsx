import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { useTheme } from '../../theme';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { Chip } from '../../components/ui/Chip';
import type { School } from '../../types/models';
import type { MyEventCardData } from '../../components/domain/MyEventCard';
import { MainStackParamList } from '../../types/navigation';
import { listFavoriteSchools } from '../../services/api/favorites';
import { listFavoriteEventIds, removeFavoriteEvent } from '../../services/api/eventFavorites';
import { listAllSchoolEvents, type SchoolEventRow } from '../../services/api/schoolEvents';
import { instructorLessonsService, type PublishedInstructorLessonListItem } from '../../services/api/instructorLessons';
import type { SchoolRow } from '../../services/api/schools';
import { hasSupabaseConfig } from '../../services/api/apiClient';

type Props = NativeStackScreenProps<MainStackParamList, 'FavoritesHub'>;

type FavoriteEventItem = MyEventCardData & {
  entityId: string;
  schoolId: string | null;
  rawDate: Date;
};

type FavoritesSectionFilter = 'all' | 'schools' | 'events' | 'lessons';

function toFavoriteSchool(row: SchoolRow): School {
  const location = [row.district, row.city].filter(Boolean).join(', ') || row.address || '';
  const image = row.image_url?.trim() || '';
  return {
    id: row.id,
    name: row.name,
    location: location || '—',
    image,
    rating: typeof row.rating === 'number' ? row.rating : 4.7,
    ratingCount: typeof row.review_count === 'number' ? row.review_count : 0,
    phone: row.telephone || undefined,
    website: row.website || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    tags: row.category ? [row.category] : undefined,
  };
}

export const FavoritesHubScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favoriteSchools, setFavoriteSchools] = useState<School[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<FavoriteEventItem[]>([]);
  const [favoriteLessons, setFavoriteLessons] = useState<FavoriteEventItem[]>([]);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<FavoritesSectionFilter>('all');

  const load = useCallback(async () => {
    setSchoolError(null);
    setEventError(null);
    setLoading(true);

    try {
      if (!hasSupabaseConfig()) {
        setFavoriteSchools([]);
        setFavoriteEvents([]);
        setFavoriteLessons([]);
        return;
      }

      const [schoolRows, favoriteEventIds, eventRows] = await Promise.all([
        listFavoriteSchools().catch((e: any) => {
          setSchoolError(e?.message || 'Favori okullar yüklenemedi');
          return [] as SchoolRow[];
        }),
        listFavoriteEventIds().catch((e: any) => {
          setEventError(e?.message || 'Favori etkinlikler yüklenemedi');
          return [] as string[];
        }),
        listAllSchoolEvents(200).catch(() => [] as SchoolEventRow[]),
      ]);

      const favoriteSchoolIds = new Set(schoolRows.map((row) => row.id));
      const favoriteEventIdSet = new Set(favoriteEventIds);
      setFavoriteSchools(schoolRows.map(toFavoriteSchool));

      const [favoriteLessonRows, favoriteEventRows] = await Promise.all([
        instructorLessonsService.listPublishedByIds(favoriteEventIds).catch(() => [] as PublishedInstructorLessonListItem[]),
        Promise.resolve(
          eventRows.filter((row) => favoriteEventIdSet.has(row.id) && (row.event_type ?? '').trim().toLowerCase() !== 'lesson'),
        ),
      ]);

      const mappedEvents = favoriteEventRows
        .map((row) => {
          const startsAt = new Date(row.starts_at);
          if (Number.isNaN(startsAt.getTime())) return null;
          return {
            entityId: row.id,
            id: `event:${row.id}`,
            title: row.title?.trim() || 'Etkinlik',
            location: row.location?.trim() || 'Konum yakında açıklanacak',
            date: startsAt.toLocaleString('tr-TR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }),
            day: startsAt.toLocaleDateString('tr-TR', { day: '2-digit' }),
            month: startsAt.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
            image: row.image_url?.trim() || '',
            isFavorite: true,
            isPopular: false,
            attendees: 0,
            attendeeAvatars: [],
            isDanceStar: false,
            badgeLabel: row.school_id && favoriteSchoolIds.has(row.school_id) ? 'Favori okul etkinliği' : undefined,
            schoolId: row.school_id,
            rawDate: startsAt,
          } as FavoriteEventItem;
        })
        .filter((item): item is FavoriteEventItem => item !== null)
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

      const mappedLessons = favoriteLessonRows
        .map((lesson) => {
          const nextDate = lesson.nextOccurrenceAt ? new Date(lesson.nextOccurrenceAt) : null;
          if (!nextDate || Number.isNaN(nextDate.getTime())) return null;
          const location = lesson.schoolName?.trim() || lesson.location?.trim() || 'Konum yakında açıklanacak';
          return {
            entityId: lesson.id,
            id: `lesson:${lesson.id}`,
            title: lesson.title?.trim() || 'Ders',
            location,
            date: `${nextDate.toLocaleString('tr-TR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })} · ${lesson.level || 'Tüm Seviyeler'}`,
            day: nextDate.toLocaleDateString('tr-TR', { day: '2-digit' }),
            month: nextDate.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
            image: lesson.imageUrl?.trim() || '',
            isFavorite: true,
            isPopular: false,
            attendees: 0,
            attendeeAvatars: lesson.instructorAvatarUrl ? [lesson.instructorAvatarUrl] : [],
            isDanceStar: false,
            badgeLabel: lesson.schoolId && favoriteSchoolIds.has(lesson.schoolId) ? 'Favori okul dersi' : undefined,
            schoolId: lesson.schoolId,
            rawDate: nextDate,
          } as FavoriteEventItem;
        })
        .filter((item): item is FavoriteEventItem => item !== null)
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

      setFavoriteEvents(mappedEvents);
      setFavoriteLessons(mappedLessons);
    } catch (e: any) {
      setFavoriteSchools([]);
      setFavoriteEvents([]);
      setFavoriteLessons([]);
      const message = e?.message || 'Favoriler yüklenemedi';
      setSchoolError(message);
      setEventError(message);
    } finally {
      setLoading(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const removeEventFavorite = useCallback(
    async (eventId: string) => {
      try {
        await removeFavoriteEvent(eventId);
        setFavoriteEvents((prev) => prev.filter((event) => event.entityId !== eventId));
        setFavoriteLessons((prev) => prev.filter((event) => event.entityId !== eventId));
      } catch (e: any) {
        setEventError(e?.message || 'Favori işlemi tamamlanamadı');
      }
    },
    [],
  );

  if (loading) {
    return <LoadingSpinner fullScreen message="Favoriler yükleniyor..." />;
  }

  const totalCount = favoriteSchools.length + favoriteEvents.length + favoriteLessons.length;
  const hasContent = totalCount > 0;
  const showSchools = sectionFilter === 'all' || sectionFilter === 'schools';
  const showEvents = sectionFilter === 'all' || sectionFilter === 'events';
  const showLessons = sectionFilter === 'all' || sectionFilter === 'lessons';
  const sectionEmpty =
    sectionFilter === 'schools'
      ? favoriteSchools.length === 0
      : sectionFilter === 'events'
        ? favoriteEvents.length === 0
        : sectionFilter === 'lessons'
          ? favoriteLessons.length === 0
          : false;

  return (
    <Screen>
      <Header title="Favoriler" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{totalCount} Favori</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Okullar, etkinlikler ve dersler tek yerde.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
          style={{ marginBottom: spacing.xl }}
        >
          <Chip label="Hepsi" selected={sectionFilter === 'all'} onPress={() => setSectionFilter('all')} icon="heart-outline" />
          <Chip label="Okullar" selected={sectionFilter === 'schools'} onPress={() => setSectionFilter('schools')} icon="school-outline" />
          <Chip label="Etkinlikler" selected={sectionFilter === 'events'} onPress={() => setSectionFilter('events')} icon="calendar-outline" />
          <Chip label="Dersler" selected={sectionFilter === 'lessons'} onPress={() => setSectionFilter('lessons')} icon="school-outline" />
        </ScrollView>

        {showSchools && favoriteSchools.length > 0 ? (
          <View style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.label, { color: '#FFFFFF' }]}>Okullar</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{favoriteSchools.length}</Text>
            </View>
            {schoolError ? (
              <Text style={[typography.caption, { color: colors.error, marginBottom: spacing.sm }]}>{schoolError}</Text>
            ) : null}
            {favoriteSchools.map((school) => (
              <View key={school.id} style={{ marginBottom: spacing.lg }}>
                <SchoolCard
                  school={school}
                  onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                  cardBackgroundColor="#341A32"
                />
              </View>
            ))}
          </View>
        ) : null}

        {showEvents && favoriteEvents.length > 0 ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.label, { color: '#FFFFFF' }]}>Etkinlikler</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{favoriteEvents.length}</Text>
            </View>
            {eventError ? (
              <Text style={[typography.caption, { color: colors.error, marginBottom: spacing.sm }]}>{eventError}</Text>
            ) : null}
            {favoriteEvents.map((event) => (
              <View key={event.entityId} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={event}
                  onPress={() => navigation.navigate('EventDetails', { id: event.entityId, fromFavorites: true })}
                  onFavoritePress={() => void removeEventFavorite(event.entityId)}
                />
              </View>
            ))}
          </View>
        ) : null}

        {showLessons && favoriteLessons.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={[typography.label, { color: '#FFFFFF' }]}>Dersler</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{favoriteLessons.length}</Text>
            </View>
            {eventError ? (
              <Text style={[typography.caption, { color: colors.error, marginBottom: spacing.sm }]}>{eventError}</Text>
            ) : null}
            {favoriteLessons.map((lesson) => (
              <View key={lesson.entityId} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={lesson}
                  onPress={() => navigation.navigate('ClassDetails', { id: lesson.entityId })}
                  onFavoritePress={() => void removeEventFavorite(lesson.entityId)}
                />
              </View>
            ))}
          </View>
        ) : null}

        {!hasContent ? (
          <EmptyState
            icon="heart-outline"
            title="Henüz favori yok."
            subtitle="Okul veya etkinliklere kalp ikonundan favori ekleyebilirsin."
          />
        ) : sectionEmpty ? (
          <EmptyState
            icon={sectionFilter === 'schools' ? 'school-outline' : sectionFilter === 'lessons' ? 'school-outline' : 'calendar-blank-outline'}
            title={
              sectionFilter === 'schools'
                ? 'Bu bölümde okul yok.'
                : sectionFilter === 'lessons'
                  ? 'Bu bölümde ders yok.'
                  : 'Bu bölümde etkinlik yok.'
            }
            subtitle="Başka filtre seçebilir veya favori ekleyebilirsin."
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
};

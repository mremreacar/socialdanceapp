import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, RefreshControl, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { EventCard } from '../../components/domain/EventCard';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { mockSchools, mockFollowing } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { Event, School } from '../../types/models';
import { useLocation, getDistanceKm } from '../../hooks/useLocation';
import { listAllSchoolEvents } from '../../services/api/schoolEvents';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { cardRowsFromExploreInstructors, instructorProfileService } from '../../services/api/instructorProfile';
import {
  formatLessonPrice,
  formatLessonStartsAt,
  instructorLessonsService,
  type PublishedInstructorLessonListItem,
} from '../../services/api/instructorLessons';
import { listSchools, type SchoolRow } from '../../services/api/schools';

function toCoordinate(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractCoordinatesFromLocationPlace(locationPlace: unknown): { latitude?: number; longitude?: number } {
  const place = toRecord(locationPlace);
  if (!place) return {};

  const latitude =
    toCoordinate(place.latitude) ??
    toCoordinate(place.lat) ??
    toCoordinate(place.y);
  const longitude =
    toCoordinate(place.longitude) ??
    toCoordinate(place.lng) ??
    toCoordinate(place.lon) ??
    toCoordinate(place.x);

  return { latitude, longitude };
}

function schoolRowToExploreSchool(row: SchoolRow): School {
  const lat = row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : undefined;
  const lng = row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : undefined;
  return {
    id: row.id,
    name: row.name,
    location: [row.district, row.city].filter(Boolean).join(', ') || row.address?.trim() || '—',
    image: row.image_url?.trim() || '',
    rating: typeof row.rating === 'number' && Number.isFinite(row.rating) ? row.rating : 0,
    ratingCount: typeof row.review_count === 'number' && Number.isFinite(row.review_count) ? row.review_count : 0,
    tags: row.category ? [row.category] : [],
    latitude: lat,
    longitude: lng,
    phone: row.telephone ?? undefined,
    website: row.website ?? undefined,
  };
}

type Nav = NativeStackNavigationProp<MainStackParamList>;

const filters = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];
const contentTypeFilters = ['Tümü', 'Etkinlik', 'Ders', 'Okul', 'Eğitmen'] as const;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatEventPriceLabel(amount: unknown, currency?: string | null): string {
  const value = toFiniteNumber(amount);
  if (value == null || value <= 0) return 'Ücretsiz';

  const normalizedCurrency = (currency ?? 'TRY').trim().toUpperCase() || 'TRY';
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return `${value} ${normalizedCurrency}`;
  }
}

function formatEventDateLabel(date: Date): string {
  return date.toLocaleString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCountPill(value: number): string {
  return value > 500 ? '500+' : String(value);
}

function compareEventsByProximityOrDate(a: Event, b: Event, userCoords: { latitude: number; longitude: number }): number {
  const aTime = a.rawDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const bTime = b.rawDate?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;

  const distanceA =
    a.latitude != null && a.longitude != null
      ? getDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude)
      : null;
  const distanceB =
    b.latitude != null && b.longitude != null
      ? getDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude)
      : null;

  if (distanceA != null && distanceB != null && distanceA !== distanceB) {
    return distanceA - distanceB;
  }
  if (distanceA != null && distanceB == null) return -1;
  if (distanceA == null && distanceB != null) return 1;
  return 0;
}

type ExploreLessonItem = PublishedInstructorLessonListItem & {
  rawDate?: Date;
  latitude?: number;
  longitude?: number;
};

function compareItemsByProximityOrDate(
  a: { rawDate?: Date | null; latitude?: number | null; longitude?: number | null },
  b: { rawDate?: Date | null; latitude?: number | null; longitude?: number | null },
  userCoords: { latitude: number; longitude: number },
): number {
  const distanceA =
    a.latitude != null && a.longitude != null
      ? getDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude)
      : null;
  const distanceB =
    b.latitude != null && b.longitude != null
      ? getDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude)
      : null;

  if (distanceA != null && distanceB != null && distanceA !== distanceB) {
    return distanceA - distanceB;
  }
  if (distanceA != null && distanceB == null) return -1;
  if (distanceA == null && distanceB != null) return 1;
  return (a.rawDate?.getTime() ?? Number.POSITIVE_INFINITY) - (b.rawDate?.getTime() ?? Number.POSITIVE_INFINITY);
}

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = useTheme();
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [activeContentType, setActiveContentType] = useState<(typeof contentTypeFilters)[number]>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [publishedLessons, setPublishedLessons] = useState<ExploreLessonItem[]>([]);
  const [exploreInstructors, setExploreInstructors] = useState<Awaited<
    ReturnType<typeof instructorProfileService.listVisibleForExplore>
  >>([]);
  const [exploreSchools, setExploreSchools] = useState<School[]>([]);
  const { coords: userCoords } = useLocation();

  const closeFilterSheet = () => setFilterSheetVisible(false);

  const loadExploreData = useCallback(async () => {
    const schoolPromise = hasSupabaseConfig()
      ? listSchools({ limit: 200 }).catch(() => [] as SchoolRow[])
      : Promise.resolve([] as SchoolRow[]);

    const [rows, lessons, instructors, schoolRows] = await Promise.all([
      listAllSchoolEvents(100),
      instructorLessonsService.listPublished(100).catch(() => [] as PublishedInstructorLessonListItem[]),
      instructorProfileService.listVisibleForExplore(),
      schoolPromise,
    ]);
    const schoolCoordinateById = new Map(
      schoolRows.map((row) => [
        row.id,
        {
          latitude: toCoordinate(row.latitude),
          longitude: toCoordinate(row.longitude),
        },
      ]),
    );
    const mapped = rows
      .map<Event | null>((row) => {
        const startsAt = new Date(row.starts_at);
        if (Number.isNaN(startsAt.getTime())) return null;
        const ownCoordinates = extractCoordinatesFromLocationPlace(row.location_place);
        const schoolCoordinates = row.school_id ? schoolCoordinateById.get(row.school_id) : undefined;
        return {
          id: row.id,
          title: row.title?.trim() || 'Etkinlik',
          date: formatEventDateLabel(startsAt),
          time: startsAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          location: row.location?.trim() || 'Konum yakında açıklanacak',
          image: row.image_url?.trim() || '',
          description: row.description?.trim() || '',
          rawDate: startsAt,
          price: formatEventPriceLabel(row.price_amount, row.price_currency),
          latitude: ownCoordinates.latitude ?? schoolCoordinates?.latitude,
          longitude: ownCoordinates.longitude ?? schoolCoordinates?.longitude,
          type: row.event_type?.trim() || undefined,
        } satisfies Event;
      })
      .filter((item): item is Event => item !== null);
    const sortedEvents = [...mapped].sort((a, b) => {
      const aTime = a.rawDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.rawDate?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    setEvents(sortedEvents);
    const lessonCoordinateBySchoolId = new Map(
      schoolRows.map((row) => [
        row.id,
        {
          latitude: toCoordinate(row.latitude),
          longitude: toCoordinate(row.longitude),
        },
      ]),
    );
    setPublishedLessons(
      lessons.map((lesson) => ({
        ...lesson,
        rawDate: lesson.nextOccurrenceAt ? new Date(lesson.nextOccurrenceAt) : undefined,
        latitude: lesson.schoolId ? lessonCoordinateBySchoolId.get(lesson.schoolId)?.latitude : undefined,
        longitude: lesson.schoolId ? lessonCoordinateBySchoolId.get(lesson.schoolId)?.longitude : undefined,
      })),
    );
    setExploreInstructors(instructors);
    setExploreSchools(schoolRows.map(schoolRowToExploreSchool));
  }, []);

  useEffect(() => {
    void loadExploreData().catch(() => {
      setEvents([]);
      setPublishedLessons([]);
      setExploreInstructors([]);
      setExploreSchools([]);
    });
  }, [loadExploreData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadExploreData()
      .catch(() => {
        setEvents([]);
        setPublishedLessons([]);
        setExploreInstructors([]);
        setExploreSchools([]);
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [loadExploreData]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const list = events.filter((event) => {
      const eventDate = new Date(event.rawDate!);
      if (Number.isNaN(eventDate.getTime())) return false;
      if (eventDate < now) return false;
      const startOfEventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      if (activeFilter === 'Bugün') {
        if (startOfEventDay.getTime() !== startOfToday.getTime()) return false;
      } else if (activeFilter === 'Bu Hafta') {
        const next7 = new Date(startOfToday);
        next7.setDate(startOfToday.getDate() + 7);
        if (startOfEventDay < startOfToday || startOfEventDay > next7) return false;
      } else if (activeFilter === 'Bu Ay') {
        if (startOfEventDay.getMonth() !== startOfToday.getMonth() || startOfEventDay.getFullYear() !== startOfToday.getFullYear()) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(q) && !event.location.toLowerCase().includes(q)) return false;
      }

      return true;
    });
    return [...list].sort((a, b) =>
      userCoords
        ? compareEventsByProximityOrDate(a, b, userCoords)
        : (a.rawDate?.getTime() ?? Number.POSITIVE_INFINITY) - (b.rawDate?.getTime() ?? Number.POSITIVE_INFINITY),
    );
  }, [activeFilter, events, searchQuery, userCoords]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source = hasSupabaseConfig() ? exploreSchools : mockSchools;
    let list = source.filter((school) => {
      if (!q) return true;
      const inName = school.name.toLowerCase().includes(q);
      const inLocation = school.location.toLowerCase().includes(q);
      const inTags = (school.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
      return inName || inLocation || inTags;
    });

    if (userCoords && list.some((s) => s.latitude != null && s.longitude != null)) {
      list = [...list].sort((a, b) => {
        const distA = getDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude ?? 0, a.longitude ?? 0);
        const distB = getDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude ?? 0, b.longitude ?? 0);
        return distA - distB;
      });
    }

    return list;
  }, [searchQuery, userCoords, exploreSchools]);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = publishedLessons.filter((lesson) => {
      if (!q) return true;
      const haystack = [
        lesson.title,
        lesson.location,
        lesson.address,
        lesson.city,
        lesson.level,
        lesson.description,
        lesson.instructorName,
        lesson.instructorUsername,
        lesson.schoolName,
        lesson.schoolCity,
        lesson.schoolDistrict,
        lesson.scheduleSummary,
      ]
        .map((value) => (value ?? '').trim().toLowerCase())
        .filter(Boolean);
      return haystack.some((value) => value.includes(q));
    });
    return [...list].sort((a, b) =>
      userCoords
        ? compareItemsByProximityOrDate(a, b, userCoords)
        : (b.rawDate?.getTime() ?? Number.NEGATIVE_INFINITY) - (a.rawDate?.getTime() ?? Number.NEGATIVE_INFINITY),
    );
  }, [publishedLessons, searchQuery, userCoords]);

  const instructorRowsForUi = useMemo(() => {
    if (hasSupabaseConfig()) {
      return cardRowsFromExploreInstructors(exploreInstructors);
    }
    return mockFollowing.map((m) => ({
      key: `mock-${m.id}`,
      title: m.name,
      subtitle: m.handle,
      avatarUrl: m.img,
      userId: `mock-instructor-${m.id}`,
      navigateName: m.name,
      navigateUsername: m.handle.replace(/^@/, ''),
      navigateBio: undefined as string | undefined,
    }));
  }, [exploreInstructors]);

  const filteredInstructors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return instructorRowsForUi;
    return instructorRowsForUi.filter((row) => {
      const u = (row.navigateUsername ?? '').toLowerCase();
      return (
        row.title.toLowerCase().includes(q) ||
        row.subtitle.toLowerCase().includes(q) ||
        u.includes(q)
      );
    });
  }, [instructorRowsForUi, searchQuery]);
  const featuredEvents = useMemo(() => {
    if (!userCoords) return [] as Event[];
    return [...filteredEvents]
      .filter((event) => event.latitude != null && event.longitude != null && event.type !== 'lesson')
      .sort((a, b) => compareEventsByProximityOrDate(a, b, userCoords))
      .slice(0, 5);
  }, [filteredEvents, userCoords]);
  const previewEvents = useMemo(() => filteredEvents.slice(0, 5), [filteredEvents]);
  const hasMoreEvents = filteredEvents.length > 5;
  const previewLessons = useMemo(() => filteredLessons.slice(0, 5), [filteredLessons]);
  const hasMoreLessons = filteredLessons.length > 5;
  const previewSchools = useMemo(() => filteredSchools.slice(0, 5), [filteredSchools]);
  const hasMoreSchools = filteredSchools.length > 5;
  const previewInstructors = useMemo(() => filteredInstructors.slice(0, 5), [filteredInstructors]);
  const isSearching = searchFocused || searchQuery.trim().length > 0;
  const hasAnySearchResult =
    previewEvents.length > 0 || previewLessons.length > 0 || filteredSchools.length > 0 || filteredInstructors.length > 0;

  const showEvents = activeContentType === 'Tümü' || activeContentType === 'Etkinlik';
  const showLessons = activeContentType === 'Tümü' || activeContentType === 'Ders';
  const showSchools = activeContentType === 'Tümü' || activeContentType === 'Okul';
  const showInstructors = activeContentType === 'Tümü' || activeContentType === 'Eğitmen';
  const activeFilterCount =
    (activeFilter !== 'Tümü' ? 1 : 0) +
    (activeContentType !== 'Tümü' ? 1 : 0);

  const openDrawer = () => {
    (navigation.getParent() as any)?.openDrawer?.();
  };
  const openAllEventsPage = () => {
    (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'Favorites' });
  };
  const openLessonsPage = () => {
    navigation.navigate('Lessons');
  };
  const openSchoolsPage = () => {
    (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'Schools' });
  };

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Keşfet',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        headerExtra={
          <View>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Etkinlik, ders, eğitmen veya okul ara"
                  backgroundColor="#482347"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(true)}
                activeOpacity={0.8}
                style={[
                  styles.filterBtn,
                  {
                    marginLeft: spacing.sm,
                    borderRadius: radius.full,
                    backgroundColor: '#311831',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                  },
                ]}
              >
                <Icon name="tune-variant" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
            progressViewOffset={80}
          />
        }
      >
        <View style={{ marginTop: -44 }}>
        {showEvents && !isSearching && featuredEvents.length > 0 ? (
          <>
            <View style={[styles.sectionHeader, { marginBottom: spacing.sm }]}>
              <View style={styles.sectionTitleRow}>
                <Icon name="map-marker-radius-outline" size={16} color={colors.primary} />
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Öne Çıkan Etkinlikler</Text>
              </View>
              <TouchableOpacity onPress={openAllEventsPage} activeOpacity={0.8} style={styles.viewAllButton}>
                <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredEventsRow}
              style={{ marginBottom: spacing.lg }}
            >
              {featuredEvents.map((event) => {
                const distanceKm = getDistanceKm(userCoords!.latitude, userCoords!.longitude, event.latitude!, event.longitude!);
                const displayEvent: Event = {
                  ...event,
                  location: `${event.location} • ${distanceKm} km`,
                };
                return (
                  <View key={event.id} style={styles.featuredEventCardWrap}>
                    <EventCard
                      event={displayEvent}
                      onPress={() => navigation.navigate('EventDetails', { id: event.id })}
                      variant="compact"
                      cardBackgroundColor="#341A32"
                    />
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}
        {showEvents && (
        <>
        {!isSearching ? (
          <View style={[styles.sectionHeader, { marginBottom: spacing.sm }]}>
            <View style={styles.sectionTitleRow}>
              <Icon name="calendar-blank-outline" size={16} color={colors.primary} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Etkinlikler</Text>
            </View>
            <View style={styles.sectionHeaderRight}>
              <View style={[styles.countPill, { backgroundColor: 'rgba(238,43,238,0.16)' }]}>
                <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>{formatCountPill(filteredEvents.length)}</Text>
              </View>
              {hasMoreEvents ? (
                <TouchableOpacity onPress={openAllEventsPage} activeOpacity={0.8} style={styles.viewAllButton}>
                  <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Tümünü Gör</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {filteredEvents.length > 0 ? (
          <>
            {previewEvents.map((event) => {
              const displayEvent: Event = {
                ...(event as Event),
                location:
                  userCoords && event.latitude != null && event.longitude != null
                    ? `${event.location} • ${getDistanceKm(userCoords.latitude, userCoords.longitude, event.latitude, event.longitude)} km`
                    : event.location,
              };
              return (
                <View key={event.id} style={{ marginBottom: spacing.md }}>
                  {isSearching ? (
                    <View style={styles.itemBadgeWrap}>
                      <View style={[styles.itemBadge, { backgroundColor: 'rgba(238,43,238,0.18)', borderColor: 'rgba(238,43,238,0.45)' }]}>
                        <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Etkinlik</Text>
                      </View>
                    </View>
                  ) : null}
                  <EventCard
                    event={displayEvent}
                    onPress={() => navigation.navigate('EventDetails', { id: event.id })}
                    cardBackgroundColor="#341A32"
                  />
                </View>
              );
            })}
          </>
        ) : (
          !isSearching ? (
            <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Bu zaman aralığında etkinlik bulunamadı.</Text>
              <Button title="Filtreleri Temizle" onPress={() => setActiveFilter('Tümü')} variant="ghost" size="sm" style={{ marginTop: spacing.md }} />
            </View>
          ) : null
        )}
        </>
        )}

        {showLessons && (
        <>
        {!isSearching ? (
          <View style={[styles.sectionHeader, { marginBottom: spacing.sm, marginTop: spacing.lg }]}>
            <View style={styles.sectionTitleRow}>
              <Icon name="book-open-page-variant-outline" size={16} color={colors.primary} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Dersler</Text>
            </View>
            <View style={styles.sectionHeaderRight}>
              <View style={[styles.countPill, { backgroundColor: 'rgba(110,231,183,0.16)' }]}>
                <Text style={[typography.captionBold, { color: '#6EE7B7' }]}>{formatCountPill(filteredLessons.length)}</Text>
              </View>
              {hasMoreLessons ? (
                <TouchableOpacity onPress={openLessonsPage} activeOpacity={0.8} style={styles.viewAllButton}>
                  <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Tümünü Gör</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {filteredLessons.length > 0 ? (
          <>
            {previewLessons.map((lesson) => {
              const displayLesson: Event & { distance?: string } = {
                id: lesson.id,
                title: lesson.title?.trim() || 'Ders',
                date: formatLessonStartsAt(lesson.nextOccurrenceAt) || 'Tarih yakında açıklanacak',
                time: '',
                location:
                  [lesson.location?.trim(), lesson.address?.trim(), lesson.city?.trim(), lesson.schoolName?.trim()]
                    .filter(Boolean)
                    .join(' · ') || 'Konum yakında açıklanacak',
                image: lesson.imageUrl?.trim() || '',
                description: lesson.description?.trim() || '',
                price: formatLessonPrice(lesson),
                latitude: lesson.latitude,
                longitude: lesson.longitude,
                distance:
                  userCoords && lesson.latitude != null && lesson.longitude != null
                    ? `${getDistanceKm(userCoords.latitude, userCoords.longitude, lesson.latitude, lesson.longitude)} km`
                    : undefined,
              };

              return (
                <View key={lesson.id} style={{ marginBottom: spacing.md }}>
                  {isSearching ? (
                    <View style={styles.itemBadgeWrap}>
                      <View style={[styles.itemBadge, { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.45)' }]}>
                        <Text style={[typography.captionBold, { color: '#6EE7B7' }]}>Ders</Text>
                      </View>
                    </View>
                  ) : null}
                  <EventCard
                    event={displayLesson}
                    onPress={() => navigation.navigate('ClassDetails', { id: lesson.id })}
                    cardBackgroundColor="#341A32"
                  />
                </View>
              );
            })}
          </>
        ) : (
          !isSearching ? (
            <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Aramaya uygun ders bulunamadı.</Text>
            </View>
          ) : null
        )}
        </>
        )}

        {showSchools && (
        <>
        {!isSearching ? (
          <View style={[styles.sectionHeader, { marginBottom: spacing.sm, marginTop: spacing.lg }]}>
            <View style={styles.sectionTitleRow}>
              <Icon name="school-outline" size={16} color={colors.primary} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Okullar</Text>
            </View>
            <View style={styles.sectionHeaderRight}>
              <View style={[styles.countPill, { backgroundColor: 'rgba(192,132,252,0.16)' }]}>
                <Text style={[typography.captionBold, { color: '#C084FC' }]}>{formatCountPill(filteredSchools.length)}</Text>
              </View>
              {hasMoreSchools ? (
                <TouchableOpacity onPress={openSchoolsPage} activeOpacity={0.8} style={styles.viewAllButton}>
                  <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Tümünü Gör</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {filteredSchools.length > 0 ? (
          previewSchools.map((school) => {
            const displaySchool: School = {
              ...(school as School),
              distance:
                userCoords && school.latitude != null && school.longitude != null
                  ? `${getDistanceKm(userCoords.latitude, userCoords.longitude, school.latitude, school.longitude)} km`
                  : school.distance,
            };
            return (
              <View key={school.id} style={{ marginBottom: spacing.md }}>
                {isSearching ? (
                  <View style={styles.itemBadgeWrap}>
                    <View style={[styles.itemBadge, { backgroundColor: 'rgba(168,85,247,0.18)', borderColor: 'rgba(168,85,247,0.45)' }]}>
                      <Text style={[typography.captionBold, { color: '#C084FC' }]}>Okul</Text>
                    </View>
                  </View>
                ) : null}
                <SchoolCard
                  school={displaySchool}
                  onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                  variant="list"
                  cardBackgroundColor="#341A32"
                />
              </View>
            );
          })
        ) : (
          !isSearching ? (
            <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Aramaya uygun dans okulu bulunamadı.</Text>
            </View>
          ) : null
        )}
        </>
        )}

        {showInstructors && (
          <>
            {!isSearching ? (
              <View style={[styles.sectionHeader, { marginBottom: spacing.sm, marginTop: spacing.lg }]}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="account-outline" size={16} color={colors.primary} />
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Eğitmenler</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={[styles.countPill, { backgroundColor: 'rgba(238,43,238,0.16)' }]}>
                    <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>{formatCountPill(filteredInstructors.length)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('InstructorsList')}
                    activeOpacity={0.8}
                    style={styles.viewAllButton}
                  >
                    <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Tümünü Gör</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {filteredInstructors.length > 0 ? (
              previewInstructors.map((instructor) => (
                <View key={instructor.key} style={{ marginBottom: spacing.md }}>
                  {isSearching ? (
                    <View style={styles.itemBadgeWrap}>
                      <View style={[styles.itemBadge, { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.45)' }]}>
                        <Text style={[typography.captionBold, { color: '#93C5FD' }]}>Eğitmen</Text>
                      </View>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        userId: instructor.userId,
                        name: instructor.navigateName,
                        username: instructor.navigateUsername || undefined,
                        avatar: instructor.avatarUrl ?? '',
                        bio: instructor.navigateBio,
                      })
                    }
                    style={[
                      styles.instructorCard,
                      {
                        backgroundColor: '#341A32',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: radius.xl,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <View style={[styles.instructorIcon, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }]}>
                      {instructor.avatarUrl ? (
                        <Image source={{ uri: instructor.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Icon name="account" size={18} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ marginLeft: spacing.md, flex: 1 }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{instructor.title}</Text>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{instructor.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              !isSearching ? (
                <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Aramaya uygun egitmen bulunamadi.</Text>
                </View>
              ) : null
            )}
          </>
        )}
        {isSearching && !hasAnySearchResult ? (
          <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Aramana uygun sonuc bulunamadi.</Text>
          </View>
        ) : null}
        </View>
      </CollapsingHeaderScrollView>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={closeFilterSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilterSheet} />
          <View
            style={[
              styles.sheetBox,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + 24,
                maxHeight: '85%',
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeaderRow}>
                <View>
                  <Text style={[typography.h4, { color: '#FFFFFF' }]}>Filtreler</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginTop: 2 }]}>
                    {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tum sonuclar gosteriliyor'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeFilterSheet}
                  activeOpacity={0.8}
                  style={[
                    styles.sheetCloseBtn,
                    {
                      borderRadius: radius.full,
                      borderColor: 'rgba(255,255,255,0.2)',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    },
                  ]}
                >
                  <Icon name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterCard}>
                <Text style={[styles.sheetSectionTitle, typography.captionBold, { color: 'rgba(255,255,255,0.85)' }]}>Zaman Çizelgesi</Text>
                <View style={styles.chipWrap}>
                  {filters.map((f) => {
                    const selected = activeFilter === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setActiveFilter(f)}
                        activeOpacity={0.8}
                        style={[
                          styles.filterChip,
                          {
                            borderRadius: radius.full,
                            borderColor: selected ? colors.primary : 'rgba(255,255,255,0.16)',
                            backgroundColor: selected ? 'rgba(238,43,238,0.2)' : 'rgba(255,255,255,0.04)',
                          },
                        ]}
                      >
                        <Text style={[typography.captionBold, { color: selected ? '#EE2AEE' : '#FFFFFF' }]}>{f}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sheetSectionTitle, typography.captionBold, { color: 'rgba(255,255,255,0.85)' }]}>İçerik Türü</Text>
                <View style={styles.chipWrap}>
                  {contentTypeFilters.map((f) => {
                    const selected = activeContentType === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setActiveContentType(f)}
                        activeOpacity={0.8}
                        style={[
                          styles.filterChip,
                          {
                            borderRadius: radius.full,
                            borderColor: selected ? colors.primary : 'rgba(255,255,255,0.16)',
                            backgroundColor: selected ? 'rgba(238,43,238,0.2)' : 'rgba(255,255,255,0.04)',
                          },
                        ]}
                      >
                        <Text style={[typography.captionBold, { color: selected ? '#EE2AEE' : '#FFFFFF' }]}>{f}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.sheetFooter, { paddingTop: spacing.md }]}>
              <TouchableOpacity
                onPress={() => {
                  setActiveFilter('Tümü');
                  setActiveContentType('Tümü');
                }}
                activeOpacity={0.8}
                style={[
                  styles.footerBtn,
                  styles.footerSecondaryBtn,
                  {
                    borderRadius: radius.full,
                    borderColor: 'rgba(255,255,255,0.18)',
                    marginRight: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Temizle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeFilterSheet}
                activeOpacity={0.85}
                style={[
                  styles.footerBtn,
                  styles.footerPrimaryBtn,
                  {
                    borderRadius: radius.full,
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  sheetSectionTitle: { marginTop: 16, marginBottom: 8 },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  featuredEventsRow: {
    paddingRight: 2,
  },
  featuredEventCardWrap: {
    width: 296,
    marginRight: 12,
  },
  itemBadgeWrap: {
    marginBottom: 8,
  },
  itemBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
  },
  footerSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  footerPrimaryBtn: {
    borderColor: 'transparent',
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  instructorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

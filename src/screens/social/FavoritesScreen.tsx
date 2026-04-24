import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Toast } from '../../components/feedback';
import { Chip } from '../../components/ui/Chip';
import { Icon } from '../../components/ui/Icon';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { ApiError, hasSupabaseConfig } from '../../services/api/apiClient';
import { addFavoriteEvent, listFavoriteEventIds, removeFavoriteEvent } from '../../services/api/eventFavorites';
import { listAllSchoolEvents } from '../../services/api/schoolEvents';
import { listFavoriteSchoolIds } from '../../services/api/favorites';
import { listSchools, type SchoolRow } from '../../services/api/schools';
import { schoolEventAttendeesService } from '../../services/api/schoolEventAttendees';
import { storage } from '../../services/storage';
import type { MyEventCardData } from '../../components/domain/MyEventCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistanceKm, useLocation } from '../../hooks/useLocation';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type EventTimeFilter = 'Tümü' | 'Bugün' | 'Bu Hafta' | 'Bu Ay';
type ReservationFilter = 'Tümü' | 'Katıldıklarım' | 'Henüz Katılmadıklarım';
type CityFilter = 'Tümü' | string;
type EventListItem = MyEventCardData & {
  entityId: string;
  rawDate: Date;
  city: string | null;
  schoolId: string | null;
  latitude?: number;
  longitude?: number;
};

const timeFilters: EventTimeFilter[] = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];
const reservationFilters: ReservationFilter[] = ['Tümü', 'Katıldıklarım', 'Henüz Katılmadıklarım'];

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toCoordinate(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function extractCoordinatesFromLocationPlace(locationPlace: unknown): { latitude?: number; longitude?: number } {
  const place = toObject(locationPlace);
  if (!place) return {};

  const latitude = toCoordinate(place.latitude) ?? toCoordinate(place.lat) ?? toCoordinate(place.y);
  const longitude = toCoordinate(place.longitude) ?? toCoordinate(place.lng) ?? toCoordinate(place.lon) ?? toCoordinate(place.x);

  return { latitude, longitude };
}

export const MyEventsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { coords: userCoords } = useLocation();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => new Set());
  const [favoriteSchoolCount, setFavoriteSchoolCount] = useState<number | null>(null);
  const [favoriteSchoolIds, setFavoriteSchoolIds] = useState<Set<string>>(() => new Set());
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(() => new Set());
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [activeTimeFilter, setActiveTimeFilter] = useState<EventTimeFilter>('Tümü');
  const [activeReservationFilter, setActiveReservationFilter] = useState<ReservationFilter>('Tümü');
  const [activeCityFilter, setActiveCityFilter] = useState<CityFilter>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleFavorite = useCallback(
    async (id: string) => {
      try {
        const nextIsFavorite = !favoritedIds.has(id);
        if (nextIsFavorite) {
          await addFavoriteEvent(id);
        } else {
          await removeFavoriteEvent(id);
        }
        setFavoritedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Favori işlemi tamamlanamadı.';
        setToastMessage(msg);
      }
    },
    [favoritedIds],
  );

  const handleReservation = async (eventId: string) => {
    if (!hasSupabaseConfig()) {
      setToastMessage('Bu özellik için uygulama yapılandırması gerekir.');
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setToastMessage('Rezervasyon için lütfen giriş yapın.');
      return;
    }
    setReservingId(eventId);
    try {
      await schoolEventAttendeesService.join(eventId);
      setJoinedEventIds((prev) => new Set(prev).add(eventId));
      setToastMessage('Etkinlik rezervasyonunuz oluşturuldu.');
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Kayıt yapılamadı.';
      setToastMessage(msg);
    } finally {
      setReservingId(null);
    }
  };

  const loadEvents = useCallback(async () => {
    const schoolPromise = hasSupabaseConfig()
      ? listSchools({ limit: 200 }).catch(() => [] as SchoolRow[])
      : Promise.resolve([] as SchoolRow[]);
    const favoriteSchoolIdsPromise = hasSupabaseConfig()
      ? (async () => {
          const token = await storage.getAccessToken();
          if (!token) return [] as string[];
          return await listFavoriteSchoolIds();
        })().catch(() => [] as string[])
      : Promise.resolve([] as string[]);

    const favoriteEventIdsPromise = hasSupabaseConfig()
      ? (async () => {
          const token = await storage.getAccessToken();
          if (!token) return [] as string[];
          return await listFavoriteEventIds();
        })().catch(() => [] as string[])
      : Promise.resolve([] as string[]);

    const [eventRows, schoolRows, favoriteSchoolIds, favoriteEventIds] = await Promise.all([
      listAllSchoolEvents(100),
      schoolPromise,
      favoriteSchoolIdsPromise,
      favoriteEventIdsPromise,
    ]);
    const favoriteSchoolIdSet = new Set(favoriteSchoolIds);
    setFavoriteSchoolIds(favoriteSchoolIdSet);
    setFavoriteSchoolCount(favoriteSchoolIdSet.size);
    setFavoritedIds(new Set(favoriteEventIds));
    const schoolCoordinateById = new Map(
      schoolRows.map((row) => [
        row.id,
        {
          latitude: toCoordinate(row.latitude),
          longitude: toCoordinate(row.longitude),
        },
      ]),
    );
    const mappedEvents = eventRows
      .filter((row) => (row.event_type ?? '').trim().toLowerCase() !== 'lesson')
      .map((row) => {
        const startsAt = new Date(row.starts_at);
        if (Number.isNaN(startsAt.getTime())) return null;
        const locationPlace = toObject(row.location_place);
        const ownCoordinates = extractCoordinatesFromLocationPlace(row.location_place);
        const schoolCoordinates = row.school_id ? schoolCoordinateById.get(row.school_id) : undefined;
        const city =
          (row.city ?? '').trim() ||
          (typeof locationPlace?.city === 'string' && locationPlace.city.trim() ? locationPlace.city.trim() : null);
        return {
          id: `event:${row.id}`,
          entityId: row.id,
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
          isFavorite: false,
          isPopular: false,
          attendees: 0,
          attendeeAvatars: [],
          isDanceStar: false,
          rawDate: startsAt,
          city,
          schoolId: row.school_id,
          latitude: ownCoordinates.latitude ?? schoolCoordinates?.latitude,
          longitude: ownCoordinates.longitude ?? schoolCoordinates?.longitude,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    setEvents(mappedEvents);

    if (!hasSupabaseConfig() || mappedEvents.length === 0) {
      setJoinedEventIds(new Set());
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setJoinedEventIds(new Set());
      return;
    }
    try {
      const eventIds = mappedEvents.map((item) => item.entityId);
      const joinedEvents = eventIds.length > 0 ? await schoolEventAttendeesService.listJoinedEventIds(eventIds) : [];
      setJoinedEventIds(new Set(joinedEvents));
    } catch {
      setJoinedEventIds(new Set());
    }
  }, []);

  useEffect(() => {
    void loadEvents().catch(() => {
      setEvents([]);
      setJoinedEventIds(new Set());
      setFavoriteSchoolIds(new Set());
      setFavoriteSchoolCount(0);
      setFavoritedIds(new Set());
    });
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents().catch(() => {
        setEvents([]);
        setJoinedEventIds(new Set());
        setFavoriteSchoolIds(new Set());
        setFavoriteSchoolCount(0);
        setFavoritedIds(new Set());
      });
    }, [loadEvents]),
  );

  const cityOptions = useMemo(
    () => ['Tümü', ...Array.from(new Set(events.map((event) => event.city).filter((city): city is string => Boolean(city))))] as CityFilter[],
    [events],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const normalizedQuery = normalizeText(searchQuery);

    const list = events.filter((event) => {
      const eventDay = new Date(event.rawDate.getFullYear(), event.rawDate.getMonth(), event.rawDate.getDate());
      if (activeTimeFilter === 'Bugün' && eventDay.getTime() !== startOfToday.getTime()) return false;
      if (activeTimeFilter === 'Bu Hafta') {
        const endOfRange = new Date(startOfToday);
        endOfRange.setDate(endOfRange.getDate() + 7);
        if (eventDay < startOfToday || eventDay > endOfRange) return false;
      }
      if (activeTimeFilter === 'Bu Ay') {
        if (eventDay.getMonth() !== startOfToday.getMonth() || eventDay.getFullYear() !== startOfToday.getFullYear()) return false;
      }
      const hasJoined = joinedEventIds.has(event.entityId);
      if (activeReservationFilter === 'Katıldıklarım' && !hasJoined) return false;
      if (activeReservationFilter === 'Henüz Katılmadıklarım' && hasJoined) return false;
      if (activeCityFilter !== 'Tümü' && event.city !== activeCityFilter) return false;
      if (normalizedQuery) {
        const haystack = [event.title, event.location, event.city ?? ''].map((value) => normalizeText(value)).join(' ');
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });

    if (!userCoords) {
      return list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }

    return list.sort((a, b) => {
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
      return a.rawDate.getTime() - b.rawDate.getTime();
    });
  }, [activeCityFilter, activeReservationFilter, activeTimeFilter, events, joinedEventIds, searchQuery, userCoords]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (searchQuery.trim()) labels.push(`Arama: ${searchQuery.trim()}`);
    if (activeTimeFilter !== 'Tümü') labels.push(activeTimeFilter);
    if (activeReservationFilter !== 'Tümü') labels.push(activeReservationFilter);
    if (activeCityFilter !== 'Tümü') labels.push(activeCityFilter);
    return labels;
  }, [activeCityFilter, activeReservationFilter, activeTimeFilter, searchQuery]);
  const activeFilterCount = activeFilterLabels.length;

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setActiveTimeFilter('Tümü');
    setActiveReservationFilter('Tümü');
    setActiveCityFilter('Tümü');
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadEvents()
      .catch(() => {
        setEvents([]);
        setJoinedEventIds(new Set());
        setFavoriteSchoolIds(new Set());
        setFavoriteSchoolCount(0);
        setFavoritedIds(new Set());
      })
      .finally(() => setRefreshing(false));
  }, [loadEvents]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();
  const openMapView = () => {
    (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'Schools', params: { isMapView: true } });
  };

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Etkinlikler',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
          rightIcon: 'map-outline',
          onRightPress: openMapView,
        }}
        headerExtraHeight={34}
        headerExtra={
          <View>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Etkinlik veya şehir ara"
                  backgroundColor="#482347"
                />
              </View>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(true)}
                activeOpacity={0.8}
                style={[styles.searchFilterButton, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }]}
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
        <View>
          <View style={styles.summaryRow}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>{filtered.length} Sonuç Bulundu</Text>
            {activeFilterLabels.length > 0 ? (
              <TouchableOpacity onPress={clearAllFilters} activeOpacity={0.8}>
                <Text style={[typography.captionBold, { color: colors.primary }]}>Filtreleri Temizle</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {activeFilterLabels.length > 0 ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Aktif filtreler: {activeFilterLabels.join(' • ')}
            </Text>
          ) : null}
          {favoriteSchoolCount != null ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              {favoriteSchoolCount} favori okul etkinliklerde yansıtılıyor
            </Text>
          ) : null}

          {filtered.length > 0 ? (
            filtered.map((event) => (
              <View key={event.id} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={{
                    id: event.id,
                    title: event.title,
                    location: event.location,
                    date: event.date,
                    day: event.day,
                    month: event.month,
                    image: event.image ?? '',
                    isFavorite: favoritedIds.has(event.entityId),
                    isPopular: event.isPopular,
                    attendees: event.attendees,
                    attendeeAvatars: event.attendeeAvatars,
                    isDanceStar: event.isDanceStar,
                    badgeLabel: event.schoolId && favoriteSchoolIds.has(event.schoolId) ? 'Favori okul etkinliği' : undefined,
                    distance:
                      userCoords && event.latitude != null && event.longitude != null
                        ? `${getDistanceKm(userCoords.latitude, userCoords.longitude, event.latitude, event.longitude)} km`
                        : undefined,
                  }}
                  onPress={() => navigation.navigate('EventDetails', { id: event.entityId, fromFavorites: true })}
                  onFavoritePress={() => void toggleFavorite(event.entityId)}
                  hasJoinedReservation={joinedEventIds.has(event.entityId)}
                  reservationLoading={reservingId === event.entityId}
                  onReservationPress={() => void handleReservation(event.entityId)}
                  onAvatarPress={(index, avatarUri) =>
                    (navigation.getParent() as any)?.navigate('UserProfile', {
                      userId: `ev-${event.entityId}-${index}`,
                      name: `Dansçı ${index + 1}`,
                      avatar: avatarUri,
                    })
                  }
                />
              </View>
            ))
          ) : (
            <EmptyState
              icon="calendar-blank-outline"
              title="Bu filtreye uygun etkinlik yok."
              subtitle={activeFilterLabels.length > 0 ? 'Filtreleri temizleyip tekrar deneyebilirsin.' : undefined}
              actionLabel={activeFilterLabels.length > 0 ? 'Filtreleri Temizle' : undefined}
              onAction={activeFilterLabels.length > 0 ? clearAllFilters : undefined}
            />
          )}
        </View>
      </CollapsingHeaderScrollView>
      <TouchableOpacity
        onPress={() => navigation.navigate('EditEvent')}
        activeOpacity={0.9}
        style={[styles.addEventFab, { backgroundColor: colors.primary, right: spacing.lg, bottom: insets.bottom + 12 }]}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={() => setFilterSheetVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFilterSheetVisible(false)} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 28 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <View style={[styles.sheetHeaderRow, { marginBottom: spacing.sm }]}>
              <View>
                <Text style={[typography.h4, { color: '#FFFFFF' }]}>Filtreler</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginTop: 2 }]}>
                  {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tüm sonuçlar gösteriliyor'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(false)}
                activeOpacity={0.8}
                style={[styles.sheetCloseBtn, { borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Zaman</Text>
              <View style={styles.chipWrap}>
                {timeFilters.map((filter) => (
                  <Chip key={filter} label={filter} selected={activeTimeFilter === filter} onPress={() => setActiveTimeFilter(filter)} icon="calendar-outline" />
                ))}
              </View>
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Katılım Durumu</Text>
              <View style={styles.chipWrap}>
                {reservationFilters.map((filter) => (
                  <Chip key={filter} label={filter} selected={activeReservationFilter === filter} onPress={() => setActiveReservationFilter(filter)} icon="account-group-outline" />
                ))}
              </View>
              {cityOptions.length > 1 ? (
                <>
                  <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Şehir</Text>
                  <View style={styles.chipWrap}>
                    {cityOptions.map((filter) => (
                      <Chip key={filter} label={filter} selected={activeCityFilter === filter} onPress={() => setActiveCityFilter(filter)} icon="map-marker-outline" />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
            <View style={[styles.sheetFooter, { marginTop: spacing.sm }]}>
              <TouchableOpacity
                onPress={clearAllFilters}
                activeOpacity={0.8}
                style={[styles.footerButton, { borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.05)', marginRight: spacing.sm }]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(false)}
                activeOpacity={0.85}
                style={[styles.footerButton, { borderColor: 'transparent', backgroundColor: colors.primary }]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchFilterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    width: 48,
    height: 48,
  },
  addEventFab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 7,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, marginBottom: 8 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetBox: { maxHeight: '82%' },
  sheetHandle: { width: 44, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetCloseBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetSectionTitle: { marginTop: 12, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetFooter: { flexDirection: 'row', alignItems: 'center' },
  footerButton: { flex: 1, minHeight: 46, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

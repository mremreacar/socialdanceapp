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
import { listAllSchoolEvents } from '../../services/api/schoolEvents';
import { schoolEventAttendeesService } from '../../services/api/schoolEventAttendees';
import { formatLessonPrice, instructorLessonsService } from '../../services/api/instructorLessons';
import { instructorLessonReservationsService } from '../../services/api/instructorLessonReservations';
import { storage } from '../../services/storage';
import type { MyEventCardData } from '../../components/domain/MyEventCard';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type EventTimeFilter = 'Tümü' | 'Bugün' | 'Bu Hafta' | 'Bu Ay';
type ReservationFilter = 'Tümü' | 'Katıldıklarım' | 'Henüz Katılmadıklarım';
type CityFilter = 'Tümü' | string;
type EventListItem = MyEventCardData & {
  kind: 'event' | 'lesson';
  entityId: string;
  rawDate: Date;
  city: string | null;
  instructorUserId?: string;
  instructorName?: string;
  instructorUsername?: string;
};

const timeFilters: EventTimeFilter[] = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];
const reservationFilters: ReservationFilter[] = ['Tümü', 'Katıldıklarım', 'Henüz Katılmadıklarım'];

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export const MyEventsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => new Set());
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(() => new Set());
  const [joinedLessonIds, setJoinedLessonIds] = useState<Set<string>>(() => new Set());
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [activeTimeFilter, setActiveTimeFilter] = useState<EventTimeFilter>('Tümü');
  const [activeReservationFilter, setActiveReservationFilter] = useState<ReservationFilter>('Tümü');
  const [activeCityFilter, setActiveCityFilter] = useState<CityFilter>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Kayıt yapılamadı.';
      setToastMessage(msg);
    } finally {
      setReservingId(null);
    }
  };

  const handleLessonReservation = async (lessonId: string) => {
    if (!hasSupabaseConfig()) {
      setToastMessage('Bu özellik için uygulama yapılandırması gerekir.');
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setToastMessage('Rezervasyon için lütfen giriş yapın.');
      return;
    }
    setReservingId(`lesson:${lessonId}`);
    try {
      await instructorLessonReservationsService.join(lessonId);
      setJoinedLessonIds((prev) => new Set(prev).add(lessonId));
      setToastMessage('Ders rezervasyonunuz oluşturuldu.');
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Kayıt yapılamadı.';
      setToastMessage(msg);
    } finally {
      setReservingId(null);
    }
  };

  const loadEvents = useCallback(async () => {
    const [eventRows, lessonRows] = await Promise.all([
      listAllSchoolEvents(100),
      instructorLessonsService.listPublished(100).catch(() => []),
    ]);
    const mappedEvents = eventRows
      .filter((row) => (row.event_type ?? '').trim().toLowerCase() !== 'lesson')
      .map((row) => {
        const startsAt = new Date(row.starts_at);
        if (Number.isNaN(startsAt.getTime())) return null;
        const locationPlace = toObject(row.location_place);
        const city = (row.city ?? '').trim() || (
          typeof locationPlace?.city === 'string' && locationPlace.city.trim()
            ? locationPlace.city.trim()
            : null
        );
        return {
          id: `event:${row.id}`,
          kind: 'event' as const,
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
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const mappedLessons = lessonRows
      .map((lesson) => {
        const startsAt = lesson.nextOccurrenceAt ? new Date(lesson.nextOccurrenceAt) : null;
        if (!startsAt || Number.isNaN(startsAt.getTime())) return null;
        const city = lesson.schoolCity?.trim() || null;
        const locationParts = [
          lesson.schoolName?.trim() || '',
          lesson.scheduleSummary?.trim() || '',
          [lesson.schoolDistrict?.trim(), lesson.schoolCity?.trim()].filter(Boolean).join(', '),
        ].filter(Boolean);
        const location =
          locationParts.join(' · ') ||
          `${lesson.instructorName} · ${formatLessonPrice(lesson)} · ${lesson.level}`;
        return {
          id: `lesson:${lesson.id}`,
          kind: 'lesson' as const,
          entityId: lesson.id,
          title: lesson.title?.trim() || 'Ders',
          location,
          date: `${startsAt.toLocaleString('tr-TR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })} · ${formatLessonPrice(lesson)}`,
          day: startsAt.toLocaleDateString('tr-TR', { day: '2-digit' }),
          month: startsAt.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
          image: lesson.imageUrl || '',
          isFavorite: false,
          isPopular: false,
          attendees: 0,
          attendeeAvatars: lesson.instructorAvatarUrl ? [lesson.instructorAvatarUrl] : [],
          isDanceStar: false,
          rawDate: startsAt,
          city,
          instructorUserId: lesson.instructorUserId,
          instructorName: lesson.instructorName,
          instructorUsername: lesson.instructorUsername,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const mapped = [...mappedEvents, ...mappedLessons].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    setEvents(mapped);

    if (!hasSupabaseConfig() || mapped.length === 0) {
      setJoinedEventIds(new Set());
      setJoinedLessonIds(new Set());
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setJoinedEventIds(new Set());
      setJoinedLessonIds(new Set());
      return;
    }
    try {
      const eventIds = mapped.filter((item) => item.kind === 'event').map((item) => item.entityId);
      const lessonIds = mapped.filter((item) => item.kind === 'lesson').map((item) => item.entityId);
      const [joinedEvents, joinedLessons] = await Promise.all([
        eventIds.length > 0 ? schoolEventAttendeesService.listJoinedEventIds(eventIds) : Promise.resolve([]),
        lessonIds.length > 0 ? instructorLessonReservationsService.listJoinedLessonIds(lessonIds).catch(() => []) : Promise.resolve([]),
      ]);
      setJoinedEventIds(new Set(joinedEvents));
      setJoinedLessonIds(new Set(joinedLessons));
    } catch {
      setJoinedEventIds(new Set());
      setJoinedLessonIds(new Set());
    }
  }, []);

  useEffect(() => {
    void loadEvents().catch(() => {
      setEvents([]);
      setJoinedEventIds(new Set());
      setJoinedLessonIds(new Set());
    });
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents().catch(() => {
        setEvents([]);
        setJoinedEventIds(new Set());
        setJoinedLessonIds(new Set());
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

    return events.filter((event) => {
      const eventDay = new Date(event.rawDate.getFullYear(), event.rawDate.getMonth(), event.rawDate.getDate());

      if (activeTimeFilter === 'Bugün' && eventDay.getTime() !== startOfToday.getTime()) {
        return false;
      }

      if (activeTimeFilter === 'Bu Hafta') {
        const endOfRange = new Date(startOfToday);
        endOfRange.setDate(endOfRange.getDate() + 7);
        if (eventDay < startOfToday || eventDay > endOfRange) {
          return false;
        }
      }

      if (activeTimeFilter === 'Bu Ay') {
        if (
          eventDay.getMonth() !== startOfToday.getMonth() ||
          eventDay.getFullYear() !== startOfToday.getFullYear()
        ) {
          return false;
        }
      }

      const hasJoined =
        event.kind === 'event' ? joinedEventIds.has(event.entityId) : joinedLessonIds.has(event.entityId);
      if (activeReservationFilter === 'Katıldıklarım' && !hasJoined) return false;
      if (activeReservationFilter === 'Henüz Katılmadıklarım' && hasJoined) return false;
      if (activeCityFilter !== 'Tümü' && event.city !== activeCityFilter) return false;
      if (normalizedQuery) {
        const haystack = [event.title, event.location, event.city ?? '', event.instructorName ?? '', event.instructorUsername ?? '']
          .map((value) => normalizeText(value))
          .join(' ');
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [activeCityFilter, activeReservationFilter, activeTimeFilter, events, joinedEventIds, joinedLessonIds, searchQuery]);

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
        setJoinedLessonIds(new Set());
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [loadEvents]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

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
          rightIcon: 'plus',
          onRightPress: () => navigation.navigate('EditEvent'),
        }}
        headerExtra={
          <View>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Etkinlik, ders veya şehir ara"
                  backgroundColor="#482347"
                />
              </View>
            </View>

            <View style={[styles.headerFilterRow, { marginTop: 10 }]}>
              <View>
                <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.82)' }]}>Filtreler</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.62)', marginTop: 2 }]}>
                  {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tüm içerikler gösteriliyor'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(true)}
                activeOpacity={0.8}
                style={[
                  styles.filterActionButton,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.14)',
                  },
                ]}
              >
                <Icon name="tune-variant" size={16} color="#FFFFFF" />
                <Text style={[typography.captionBold, { color: '#FFFFFF', marginLeft: 6 }]}>Filtrele</Text>
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
        <View style={{ marginTop: spacing.sm }}>
          <View style={[styles.summaryRow, { marginBottom: spacing.sm }]}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>
              {filtered.length} Sonuç Bulundu
            </Text>
            {activeFilterLabels.length > 0 ? (
              <TouchableOpacity
                onPress={clearAllFilters}
                activeOpacity={0.8}
              >
                <Text style={[typography.captionBold, { color: colors.primary }]}>Filtreleri Temizle</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {activeFilterLabels.length > 0 ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Aktif filtreler: {activeFilterLabels.join(' • ')}
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
                    isFavorite: favoritedIds.has(String(event.id)),
                    isPopular: event.isPopular,
                    attendees: event.attendees,
                    attendeeAvatars: event.attendeeAvatars,
                    isDanceStar: event.isDanceStar,
                  }}
                  onPress={() =>
                    event.kind === 'event'
                      ? navigation.navigate('EventDetails', { id: event.entityId, fromFavorites: true })
                      : navigation.navigate('ClassDetails', { id: event.entityId })
                  }
                  onFavoritePress={() => toggleFavorite(String(event.id))}
                  hasJoinedReservation={
                    event.kind === 'event' ? joinedEventIds.has(event.entityId) : joinedLessonIds.has(event.entityId)
                  }
                  reservationLoading={
                    event.kind === 'event' ? reservingId === event.entityId : reservingId === `lesson:${event.entityId}`
                  }
                  actionLabel={event.kind === 'lesson' ? 'Derse Katıl' : undefined}
                  onReservationPress={() =>
                    event.kind === 'event'
                      ? void handleReservation(event.entityId)
                      : void handleLessonReservation(event.entityId)
                  }
                  onAvatarPress={(index, avatarUri) =>
                    event.kind === 'lesson' && event.instructorUserId
                      ? (navigation.getParent() as any)?.navigate('UserProfile', {
                          userId: event.instructorUserId,
                          name: event.instructorName || 'Eğitmen',
                          username: event.instructorUsername,
                          avatar: avatarUri,
                        })
                      : (navigation.getParent() as any)?.navigate('UserProfile', {
                          userId: `ev-${event.entityId}-${index}`,
                          name: `Dansçı ${index + 1}`,
                          avatar: avatarUri,
                        })
                  }
                />
                {event.kind === 'event' && event.isDanceStar && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('DanceStar', {
                        eventId: event.entityId,
                        eventTitle: event.title,
                        attendees: (event.attendeeAvatars ?? []).map((avatar, index) => ({
                          id: `ev-${event.entityId}-${index}`,
                          name: `Dansçı ${index + 1}`,
                          avatar,
                        })),
                      })
                    }
                    style={[styles.dqBtn, { backgroundColor: colors.purple, marginTop: spacing.sm }]}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>DanceStar ⭐</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <EmptyState
              icon="calendar-blank-outline"
              title="Bu filtreye uygun içerik yok."
              subtitle={activeFilterLabels.length > 0 ? 'Filtreleri temizleyip tekrar deneyebilirsin.' : undefined}
              actionLabel={activeFilterLabels.length > 0 ? 'Filtreleri Temizle' : undefined}
              onAction={
                activeFilterLabels.length > 0 ? clearAllFilters : undefined
              }
            />
          )}
        </View>
      </CollapsingHeaderScrollView>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={() => setFilterSheetVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFilterSheetVisible(false)} />
          <View
            style={[
              styles.sheetBox,
              {
                backgroundColor: colors.headerBg,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: 28,
              },
            ]}
          >
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
                style={[
                  styles.sheetCloseBtn,
                  {
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Zaman</Text>
              <View style={styles.chipWrap}>
                {timeFilters.map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    selected={activeTimeFilter === filter}
                    onPress={() => setActiveTimeFilter(filter)}
                    icon="calendar-outline"
                  />
                ))}
              </View>

              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Katılım Durumu</Text>
              <View style={styles.chipWrap}>
                {reservationFilters.map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    selected={activeReservationFilter === filter}
                    onPress={() => setActiveReservationFilter(filter)}
                    icon="account-group-outline"
                  />
                ))}
              </View>

              {cityOptions.length > 1 ? (
                <>
                  <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Şehir</Text>
                  <View style={styles.chipWrap}>
                    {cityOptions.map((filter) => (
                      <Chip
                        key={filter}
                        label={filter}
                        selected={activeCityFilter === filter}
                        onPress={() => setActiveCityFilter(filter)}
                        icon="map-marker-outline"
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={[styles.sheetFooter, { marginTop: spacing.sm }]}>
              <TouchableOpacity
                onPress={clearAllFilters}
                activeOpacity={0.8}
                style={[
                  styles.footerButton,
                  {
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    marginRight: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(false)}
                activeOpacity={0.85}
                style={[
                  styles.footerButton,
                  {
                    borderColor: 'transparent',
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
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  dqBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  searchRow: {
    marginTop: 8,
  },
  headerFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetBox: {
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionTitle: {
    marginTop: 12,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

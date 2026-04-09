import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import { formatLessonPrice, instructorLessonsService } from '../../services/api/instructorLessons';
import { instructorLessonReservationsService } from '../../services/api/instructorLessonReservations';
import { storage } from '../../services/storage';
import type { MyEventCardData } from '../../components/domain/MyEventCard';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type EventTimeFilter = 'Tümü' | 'Bugün' | 'Bu Hafta' | 'Bu Ay';
type ReservationFilter = 'Tümü' | 'Katıldıklarım' | 'Henüz Katılmadıklarım';
type CityFilter = 'Tümü' | string;
type LessonTypeFilter = 'Tümü' | 'Özel ders' | 'Grup dersi';
type DeliveryModeFilter = 'Tümü' | 'Online' | 'Yüz yüze';
type LessonListItem = MyEventCardData & {
  entityId: string;
  rawDate: Date;
  city: string | null;
  lessonType: Exclude<LessonTypeFilter, 'Tümü'>;
  deliveryMode: Exclude<DeliveryModeFilter, 'Tümü'>;
  instructorUserId?: string;
  instructorName?: string;
  instructorUsername?: string;
};

const timeFilters: EventTimeFilter[] = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];
const reservationFilters: ReservationFilter[] = ['Tümü', 'Katıldıklarım', 'Henüz Katılmadıklarım'];
const lessonTypeFilters: LessonTypeFilter[] = ['Tümü', 'Özel ders', 'Grup dersi'];
const deliveryModeFilters: DeliveryModeFilter[] = ['Tümü', 'Online', 'Yüz yüze'];

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const LessonsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => new Set());
  const [joinedLessonIds, setJoinedLessonIds] = useState<Set<string>>(() => new Set());
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [activeTimeFilter, setActiveTimeFilter] = useState<EventTimeFilter>('Tümü');
  const [activeReservationFilter, setActiveReservationFilter] = useState<ReservationFilter>('Tümü');
  const [activeCityFilter, setActiveCityFilter] = useState<CityFilter>('Tümü');
  const [activeLessonTypeFilter, setActiveLessonTypeFilter] = useState<LessonTypeFilter>('Tümü');
  const [activeDeliveryModeFilter, setActiveDeliveryModeFilter] = useState<DeliveryModeFilter>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isClosingFilterSheetRef = useRef(false);

  const toggleFavorite = (id: string) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Kayıt yapılamadı.';
      setToastMessage(msg);
    } finally {
      setReservingId(null);
    }
  };

  const loadLessons = useCallback(async () => {
    const lessonRows = await instructorLessonsService.listPublished(100).catch(() => []);
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
        const location = locationParts.join(' · ') || `${lesson.instructorName} · ${formatLessonPrice(lesson)} · ${lesson.level}`;
        const lessonType: LessonListItem['lessonType'] = lesson.lessonFormat === 'private' ? 'Özel ders' : 'Grup dersi';
        const deliveryMode: LessonListItem['deliveryMode'] = lesson.deliveryMode === 'online' ? 'Online' : 'Yüz yüze';
        return {
          id: `lesson:${lesson.id}`,
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
          lessonType,
          deliveryMode,
          instructorUserId: lesson.instructorUserId,
          instructorName: lesson.instructorName,
          instructorUsername: lesson.instructorUsername,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    setLessons(mappedLessons);

    if (!hasSupabaseConfig() || mappedLessons.length === 0) {
      setJoinedLessonIds(new Set());
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setJoinedLessonIds(new Set());
      return;
    }
    try {
      const joinedLessons = await instructorLessonReservationsService.listJoinedLessonIds(mappedLessons.map((item) => item.entityId)).catch(() => []);
      setJoinedLessonIds(new Set(joinedLessons));
    } catch {
      setJoinedLessonIds(new Set());
    }
  }, []);

  useEffect(() => {
    void loadLessons().catch(() => {
      setLessons([]);
      setJoinedLessonIds(new Set());
    });
  }, [loadLessons]);

  useFocusEffect(
    useCallback(() => {
      void loadLessons().catch(() => {
        setLessons([]);
        setJoinedLessonIds(new Set());
      });
    }, [loadLessons]),
  );

  const cityOptions = useMemo(
    () => ['Tümü', ...Array.from(new Set(lessons.map((item) => item.city).filter((city): city is string => Boolean(city))))] as CityFilter[],
    [lessons],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const normalizedQuery = normalizeText(searchQuery);
    return lessons.filter((lesson) => {
      const lessonDay = new Date(lesson.rawDate.getFullYear(), lesson.rawDate.getMonth(), lesson.rawDate.getDate());
      if (activeTimeFilter === 'Bugün' && lessonDay.getTime() !== startOfToday.getTime()) return false;
      if (activeTimeFilter === 'Bu Hafta') {
        const endOfRange = new Date(startOfToday);
        endOfRange.setDate(endOfRange.getDate() + 7);
        if (lessonDay < startOfToday || lessonDay > endOfRange) return false;
      }
      if (activeTimeFilter === 'Bu Ay') {
        if (lessonDay.getMonth() !== startOfToday.getMonth() || lessonDay.getFullYear() !== startOfToday.getFullYear()) return false;
      }
      const hasJoined = joinedLessonIds.has(lesson.entityId);
      if (activeReservationFilter === 'Katıldıklarım' && !hasJoined) return false;
      if (activeReservationFilter === 'Henüz Katılmadıklarım' && hasJoined) return false;
      if (activeCityFilter !== 'Tümü' && lesson.city !== activeCityFilter) return false;
      if (activeLessonTypeFilter !== 'Tümü' && lesson.lessonType !== activeLessonTypeFilter) return false;
      if (activeDeliveryModeFilter !== 'Tümü' && lesson.deliveryMode !== activeDeliveryModeFilter) return false;
      if (normalizedQuery) {
        const haystack = [lesson.title, lesson.location, lesson.city ?? '', lesson.instructorName ?? '', lesson.instructorUsername ?? '']
          .map((value) => normalizeText(value))
          .join(' ');
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [activeCityFilter, activeDeliveryModeFilter, activeLessonTypeFilter, activeReservationFilter, activeTimeFilter, joinedLessonIds, lessons, searchQuery]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (searchQuery.trim()) labels.push(`Arama: ${searchQuery.trim()}`);
    if (activeTimeFilter !== 'Tümü') labels.push(activeTimeFilter);
    if (activeReservationFilter !== 'Tümü') labels.push(activeReservationFilter);
    if (activeCityFilter !== 'Tümü') labels.push(activeCityFilter);
    if (activeLessonTypeFilter !== 'Tümü') labels.push(activeLessonTypeFilter);
    if (activeDeliveryModeFilter !== 'Tümü') labels.push(activeDeliveryModeFilter);
    return labels;
  }, [activeCityFilter, activeDeliveryModeFilter, activeLessonTypeFilter, activeReservationFilter, activeTimeFilter, searchQuery]);
  const activeFilterCount = activeFilterLabels.length;

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setActiveTimeFilter('Tümü');
    setActiveReservationFilter('Tümü');
    setActiveCityFilter('Tümü');
    setActiveLessonTypeFilter('Tümü');
    setActiveDeliveryModeFilter('Tümü');
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadLessons()
      .catch(() => {
        setLessons([]);
        setJoinedLessonIds(new Set());
      })
      .finally(() => setRefreshing(false));
  }, [loadLessons]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();
  const closeFilterSheet = useCallback(() => {
    if (isClosingFilterSheetRef.current) return;
    isClosingFilterSheetRef.current = true;
    setFilterSheetVisible(false);
    setTimeout(() => {
      isClosingFilterSheetRef.current = false;
    }, 250);
  }, []);

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Dersler',
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
              <View style={styles.searchInputWrap}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Ders, eğitmen veya şehir ara" backgroundColor="#482347" />
              </View>
              <TouchableOpacity
                onPress={() => setFilterSheetVisible(true)}
                activeOpacity={0.8}
                style={[styles.filterActionButton, { backgroundColor: '#311831', borderColor: 'rgba(255,255,255,0.14)' }]}
              >
                <Icon name="tune-variant" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={[styles.headerFilterRow, { marginTop: 10 }]}>
              <View>
                <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.82)' }]}>Filtreler</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.62)', marginTop: 2 }]}>
                  {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tüm dersler gösteriliyor'}
                </Text>
              </View>
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
        <View style={{ marginTop: spacing.xs }}>
          <View style={[styles.summaryRow, { marginBottom: spacing.sm }]}>
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
          {filtered.length > 0 ? (
            filtered.map((lesson) => (
              <View key={lesson.id} style={{ marginBottom: spacing.lg }}>
                <MyEventCard
                  event={{
                    id: lesson.id,
                    title: lesson.title,
                    location: lesson.location,
                    date: lesson.date,
                    day: lesson.day,
                    month: lesson.month,
                    image: lesson.image ?? '',
                    isFavorite: favoritedIds.has(String(lesson.id)),
                    isPopular: lesson.isPopular,
                    attendees: lesson.attendees,
                    attendeeAvatars: lesson.attendeeAvatars,
                    isDanceStar: lesson.isDanceStar,
                  }}
                  onPress={() => navigation.navigate('ClassDetails', { id: lesson.entityId })}
                  onFavoritePress={() => toggleFavorite(String(lesson.id))}
                  hasJoinedReservation={joinedLessonIds.has(lesson.entityId)}
                  reservationLoading={reservingId === `lesson:${lesson.entityId}`}
                  actionLabel="Derse Katıl"
                  onReservationPress={() => void handleLessonReservation(lesson.entityId)}
                  onAvatarPress={(_index, avatarUri) =>
                    lesson.instructorUserId
                      ? (navigation.getParent() as any)?.navigate('UserProfile', {
                          userId: lesson.instructorUserId,
                          name: lesson.instructorName || 'Eğitmen',
                          username: lesson.instructorUsername,
                          avatar: avatarUri,
                        })
                      : undefined
                  }
                />
              </View>
            ))
          ) : (
            <EmptyState
              icon="calendar-blank-outline"
              title="Bu filtreye uygun ders yok."
              subtitle={activeFilterLabels.length > 0 ? 'Filtreleri temizleyip tekrar deneyebilirsin.' : undefined}
              actionLabel={activeFilterLabels.length > 0 ? 'Filtreleri Temizle' : undefined}
              onAction={activeFilterLabels.length > 0 ? clearAllFilters : undefined}
            />
          )}
        </View>
      </CollapsingHeaderScrollView>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={closeFilterSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilterSheet} />
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
                onPress={closeFilterSheet}
                activeOpacity={0.8}
                style={[styles.sheetCloseBtn, { borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              bounces
              alwaysBounceVertical
              scrollEventThrottle={16}
              onScroll={(event) => {
                if (event.nativeEvent.contentOffset.y < -48) {
                  closeFilterSheet();
                }
              }}
            >
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Tarih</Text>
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
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Ders Türü</Text>
              <View style={styles.chipWrap}>
                {lessonTypeFilters.map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    selected={activeLessonTypeFilter === filter}
                    onPress={() => setActiveLessonTypeFilter(filter)}
                    icon="school-outline"
                  />
                ))}
              </View>
              <Text style={[typography.captionBold, styles.sheetSectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>Katılım Şekli</Text>
              <View style={styles.chipWrap}>
                {deliveryModeFilters.map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    selected={activeDeliveryModeFilter === filter}
                    onPress={() => setActiveDeliveryModeFilter(filter)}
                    icon={filter === 'Online' ? 'video-outline' : 'map-marker-outline'}
                  />
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
                onPress={closeFilterSheet}
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
  searchInputWrap: { flex: 1 },
  headerFilterRow: { alignItems: 'flex-start', justifyContent: 'space-between' },
  filterActionButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
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

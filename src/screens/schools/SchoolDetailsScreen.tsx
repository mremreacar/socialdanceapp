import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Linking,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { MainStackParamList } from '../../types/navigation';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { getSchoolById } from '../../services/api/schools';
import { listSchoolEvents } from '../../services/api/schoolEvents';
import { listSchoolClasses } from '../../services/api/schoolClasses';
import { addFavoriteSchool, isSchoolFavorited, removeFavoriteSchool } from '../../services/api/favorites';

type Props = NativeStackScreenProps<MainStackParamList, 'SchoolDetails'>;

type SchoolDetailsClassItem = {
  id: string;
  title: string;
  time: string;
  day: string;
  level: string;
};

type SchoolDetailsEventItem = {
  id: string;
  title: string;
  date: string;
  eventType: string | null;
};

type SchoolDetailsLessonItem = {
  id: string;
  title: string;
  date: string;
};

const defaultSchool = {
  id: '1',
  name: 'Salsa Academy Istanbul',
  location: 'Kadıköy, İstanbul',
  image: '',
  rating: 4.8,
  ratingCount: 124,
  description: '',
  phone: undefined as string | undefined,
  website: undefined as string | undefined,
  classes: [
    { id: 'c1', title: 'Başlangıç Salsa', time: '19:00', day: 'Pazartesi', level: 'Başlangıç' },
    { id: 'c2', title: 'Orta Seviye Bachata', time: '20:30', day: 'Çarşamba', level: 'Orta' },
  ],
  lessonPrograms: [],
  events: [
    { id: 'e1', title: 'Latin Night', date: 'Cumartesi, 22:00', eventType: 'event' as const },
  ],
};

const EVENTS_PAGE_SIZE = 6;

type SchoolDetailsVm = {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  ratingCount: number;
  description: string;
  phone?: string;
  website?: string;
  isOpen?: boolean;
  statusLabel?: string;
  classes: SchoolDetailsClassItem[];
  lessonPrograms: SchoolDetailsLessonItem[];
  events: SchoolDetailsEventItem[];
};

function isMissingSchoolEventsError(error: unknown): boolean {
  const blob =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error ?? '');
  const lower = blob.toLowerCase();
  return (
    lower.includes('school_events') &&
    (lower.includes('could not find') || lower.includes('schema cache') || lower.includes('pgrst'))
  );
}

function isMissingSchoolClassesError(error: unknown): boolean {
  const blob =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error ?? '');
  const lower = blob.toLowerCase();
  return (
    lower.includes('school_classes') &&
    (lower.includes('could not find') || lower.includes('schema cache') || lower.includes('pgrst'))
  );
}

function normalizeDigitsForWhatsApp(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('90') && d.length >= 12) return d;
  if (d.startsWith('0') && d.length >= 10) return `90${d.slice(1)}`;
  return d;
}

function formatEventDateLabel(iso: string): string {
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

export const SchoolDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('schedule');
  const [isFavorite, setIsFavorite] = useState(false);
  const [school, setSchool] = useState<SchoolDetailsVm | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [eventsHasMore, setEventsHasMore] = useState(false);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fav = await isSchoolFavorited(route.params.id);
        if (!cancelled) setIsFavorite(fav);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.id]);

  const loadSchool = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const row = await getSchoolById(route.params.id);
      let classRows: Awaited<ReturnType<typeof listSchoolClasses>> = [];
      try {
        classRows = await listSchoolClasses(route.params.id);
      } catch (classError) {
        // If API schema cache is stale, keep school details working and show empty schedule.
        if (!isMissingSchoolClassesError(classError)) throw classError;
      }
      let eventRows: Awaited<ReturnType<typeof listSchoolEvents>> = [];
      try {
        eventRows = await listSchoolEvents(route.params.id, 100);
      } catch (eventError) {
        // If API schema cache is stale, keep school details working and show empty events.
        if (!isMissingSchoolEventsError(eventError)) throw eventError;
      }
      if (!row) {
        setError('Okul bulunamadı');
        setSchool(null);
        return;
      }

      const location =
        [row.district, row.city].filter(Boolean).join(', ') ||
        row.address ||
        defaultSchool.location;
      const image = row.image_url?.trim() || '';
      const description = (row as any).snippet ? String((row as any).snippet).trim() : '';
      const statusText = row.current_status ? String(row.current_status).trim() : '';
      const isOpen = statusText === 'Acik' ? true : statusText === 'Kapali' ? false : undefined;

      const normalizedEventRows = eventRows.map((eventRow) => ({
        id: eventRow.id,
        title: eventRow.title,
        date: formatEventDateLabel(eventRow.starts_at),
        eventType: (eventRow.event_type ?? '').trim().toLowerCase() || null,
      }));
      const lessonPrograms: SchoolDetailsLessonItem[] = normalizedEventRows
        .filter((eventItem) => eventItem.eventType === 'lesson')
        .map((eventItem) => ({
          id: eventItem.id,
          title: eventItem.title,
          date: eventItem.date,
        }));
      const schoolEvents: SchoolDetailsEventItem[] = normalizedEventRows
        .filter((eventItem) => eventItem.eventType !== 'lesson')
        .slice(0, EVENTS_PAGE_SIZE);
      setEventsHasMore(normalizedEventRows.filter((eventItem) => eventItem.eventType !== 'lesson').length > EVENTS_PAGE_SIZE);
      const schoolClasses =
        classRows.length > 0
          ? classRows.map((classRow) => ({
              id: classRow.id,
              title: classRow.title,
              time: classRow.time,
              day: classRow.day,
              level: classRow.level,
            }))
          : [];

      setSchool({
        ...defaultSchool,
        id: row.id,
        name: row.name,
        location,
        image,
        rating: typeof row.rating === 'number' && Number.isFinite(row.rating) ? row.rating : defaultSchool.rating,
        ratingCount: typeof row.review_count === 'number' && Number.isFinite(row.review_count) ? row.review_count : defaultSchool.ratingCount,
        description,
        phone: row.telephone || undefined,
        website: row.website || undefined,
        isOpen,
        statusLabel: statusText || undefined,
        classes: schoolClasses,
        lessonPrograms,
        events: schoolEvents,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okul yüklenemedi');
      setEventsHasMore(false);
      setSchool(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadSchool({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadSchool, refreshing]);

  const currentSchool: SchoolDetailsVm = useMemo(
    () => ({
      ...defaultSchool,
      ...(school ?? {}),
      classes: school?.classes ?? defaultSchool.classes,
      lessonPrograms: school?.lessonPrograms ?? defaultSchool.lessonPrograms,
      events: school?.events ?? defaultSchool.events,
    }),
    [school],
  );
  const hasSchoolImage = Boolean(currentSchool.image?.trim());
  const heroImageSource =
    hasSchoolImage && !imageLoadFailed
      ? { uri: currentSchool.image.trim() }
      : require('../../../assets/social_dance.png');

  useEffect(() => {
    setImageLoadFailed(false);
  }, [currentSchool.image]);

  const handleShare = () => {
    Share.share({
      message: `${currentSchool.name}\n${currentSchool.location}\n⭐ ${currentSchool.rating} (${currentSchool.ratingCount} değerlendirme)`,
      title: currentSchool.name,
    }).catch(() => {});
  };

  const headerRight = (
    <View style={styles.headerRightStack}>
      <TouchableOpacity
        onPress={handleShare}
        style={[styles.headerOverlayBtn, { borderRadius: radius.full }]}
        activeOpacity={0.7}
      >
        <Icon name="share-variant" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const next = !isFavorite;
          setIsFavorite(next);
          try {
            if (next) await addFavoriteSchool(route.params.id);
            else await removeFavoriteSchool(route.params.id);
          } catch (e: any) {
            setIsFavorite(!next);
            Alert.alert('Favorilere eklenemedi', e?.message || 'Lütfen tekrar deneyin.');
          }
        }}
        style={[styles.headerOverlayBtn, { borderRadius: radius.full, marginTop: 8 }]}
        activeOpacity={0.7}
      >
        <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  const tabs = [
    { key: 'schedule', label: 'Ders Programı' },
    { key: 'events', label: 'Etkinlikler' },
  ];

  const contactPhoneRaw = currentSchool.phone ? String(currentSchool.phone).trim() : '';
  const contactTelHref = contactPhoneRaw.replace(/[^\d+]/g, '');
  const contactWaDigits = contactPhoneRaw ? normalizeDigitsForWhatsApp(contactPhoneRaw) : '';
  const contactWebsite = currentSchool.website ? String(currentSchool.website).trim() : '';
  const contactWebsiteUrl = contactWebsite
    ? contactWebsite.startsWith('http')
      ? contactWebsite
      : `https://${contactWebsite}`
    : '';

  const openWhatsApp = () => {
    if (!contactWaDigits) return;
    const url = `https://wa.me/${contactWaDigits}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp açılamadı', 'Cihazınızda WhatsApp yüklü mü kontrol edin.');
    });
  };

  const handleContact = () => {
    if (contactTelHref || contactWaDigits) {
      setContactModalVisible(true);
      return;
    }
    if (contactWebsiteUrl) {
      Linking.openURL(contactWebsiteUrl).catch(() => {});
    }
  };

  const loadMoreEvents = useCallback(async () => {
    if (eventsLoadingMore || !school || !eventsHasMore) return;
    setEventsLoadingMore(true);
    try {
      const nextRows = await listSchoolEvents(route.params.id, EVENTS_PAGE_SIZE + 1, {
        offset: school.events.length,
      });
      const nextPageRows = nextRows.slice(0, EVENTS_PAGE_SIZE);
      setSchool((prev) => {
        if (!prev || nextPageRows.length === 0) return prev;
        const existingIds = new Set(prev.events.map((event) => event.id));
        const appendedEvents = nextPageRows
          .filter((eventRow) => !existingIds.has(eventRow.id))
          .map((eventRow) => ({
            id: eventRow.id,
            title: eventRow.title,
            date: formatEventDateLabel(eventRow.starts_at),
            eventType: (eventRow.event_type ?? '').trim().toLowerCase() || null,
          }))
          .filter((eventItem) => eventItem.eventType !== 'lesson');
        if (appendedEvents.length === 0) return prev;
        return {
          ...prev,
          events: [...prev.events, ...appendedEvents],
        };
      });
      setEventsHasMore(nextRows.length > EVENTS_PAGE_SIZE);
    } catch {
      Alert.alert('Etkinlikler yüklenemedi', 'Lütfen tekrar deneyin.');
    } finally {
      setEventsLoadingMore(false);
    }
  }, [eventsHasMore, eventsLoadingMore, route.params.id, school]);

  return (
    <Screen edges={[]}>
      {loading ? (
        <LoadingSpinner fullScreen message="Okul yükleniyor..." color="#FFFFFF" />
      ) : error ? (
        <View style={{ paddingTop: insets.top }}>
          <EmptyState icon="school-outline" title="Okul yüklenemedi" subtitle={error} />
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical
            bounces
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
                colors={['#FFFFFF']}
                progressViewOffset={insets.top + 72}
              />
            }
          >
            <View style={[styles.heroWrap, { marginTop: insets.top }]}>
              <Image
                source={heroImageSource}
                style={styles.heroImage}
                contentFit={hasSchoolImage && !imageLoadFailed ? 'cover' : 'contain'}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                transition={200}
                onError={() => setImageLoadFailed(true)}
              />
              <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
            </View>

            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
              <Text style={[typography.h3, { color: '#FFFFFF' }]}>{currentSchool.name}</Text>
              {typeof currentSchool.isOpen === 'boolean' ? (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      marginTop: spacing.xs,
                      borderRadius: radius.full,
                      backgroundColor: 'rgba(75,21,75,0.72)',
                      borderColor: 'rgba(255,255,255,0.12)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: currentSchool.isOpen ? '#22C55E' : '#EF4444' },
                    ]}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: 'rgba(255,255,255,0.82)' },
                    ]}
                  >
                    {currentSchool.isOpen ? 'Açık' : 'Kapalı'}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="map-marker-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{currentSchool.location}</Text>
              </View>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="star" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>
                  {currentSchool.rating} • {currentSchool.ratingCount} değerlendirme
                </Text>
              </View>

          <View style={{ marginTop: spacing.xl }}>
            <TabSwitch
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              containerRadius={50}
              containerBgColor="#311831"
              indicatorColor="#020617"
              textColor="#9CA3AF"
              activeTextColor="#FFFFFF"
            />
          </View>

          {activeTab === 'schedule' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {currentSchool.classes.length === 0 && currentSchool.lessonPrograms.length === 0 ? (
                <EmptyState
                  icon="calendar-clock"
                  title="Ders programı bulunamadı"
                  subtitle="Bu okul için henüz ders programı eklenmemiştir."
                />
              ) : (
                <>
                  {currentSchool.classes.map((c: SchoolDetailsClassItem) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => navigation.navigate('ClassDetails', { id: c.id })}
                      activeOpacity={0.8}
                      style={[styles.cardRow, { backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                        <Icon name="calendar-clock" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{c.title}</Text>
                        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                          {c.day} • {c.time} • {c.level}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                  {currentSchool.lessonPrograms.map((lessonItem) => (
                    <TouchableOpacity
                      key={lessonItem.id}
                      onPress={() => navigation.navigate('ClassDetails', { id: lessonItem.id })}
                      activeOpacity={0.8}
                      style={[styles.cardRow, { backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                        <Icon name="school-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{lessonItem.title}</Text>
                        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{lessonItem.date}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === 'events' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {currentSchool.events.length === 0 ? (
                <EmptyState
                  icon="calendar-blank-outline"
                  title="Yaklaşan etkinlik bulunamadı"
                  subtitle="Bu okul için şu anda gösterilecek etkinlik yok."
                />
              ) : (
                currentSchool.events.map((e: SchoolDetailsEventItem) => (
                  <TouchableOpacity
                    key={e.id}
                    activeOpacity={0.8}
                    onPress={() =>
                      e.eventType === 'lesson'
                        ? navigation.navigate('ClassDetails', { id: e.id })
                        : navigation.navigate('EventDetails', { id: e.id })
                    }
                    style={[styles.cardRow, { backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                      <Icon name="party-popper" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{e.title}</Text>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{e.date}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
              {currentSchool.events.length > 0 && eventsHasMore ? (
                <Button
                  title={eventsLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                  onPress={loadMoreEvents}
                  disabled={eventsLoadingMore}
                  variant="secondary"
                  fullWidth
                  style={{ borderRadius: radius.xl, marginTop: spacing.xs }}
                />
              ) : null}
            </View>
          )}

          {Boolean(currentSchool.description && String(currentSchool.description).trim()) && (
            <>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: spacing.xl }} />
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Hakkında</Text>
                <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)', lineHeight: 22 }]}>
                  {currentSchool.description}
                </Text>
              </View>
            </>
          )}

          <View style={{ height: spacing.xl }} />
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.headerBg,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.lg,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Button
              title="İletişime Geç"
              onPress={handleContact}
              disabled={!contactTelHref && !contactWebsiteUrl}
              fullWidth
              style={{ borderRadius: 50 }}
            />
          </View>
            </View>
          </ScrollView>

          <Modal
            visible={contactModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setContactModalVisible(false)}
          >
            <Pressable style={styles.contactModalOverlay} onPress={() => setContactModalVisible(false)}>
              <Pressable
                style={[styles.contactModalSheet, { backgroundColor: '#311831', borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl }]}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>İletişime geç</Text>
                {contactWaDigits ? (
                  <TouchableOpacity
                    style={[styles.contactModalRow, { borderColor: 'rgba(255,255,255,0.12)' }]}
                    onPress={() => {
                      setContactModalVisible(false);
                      openWhatsApp();
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon name="whatsapp" size={22} color="#25D366" />
                    <Text style={[typography.bodyMedium, { color: '#FFFFFF', marginLeft: spacing.md, flex: 1 }]}>WhatsApp ile yaz</Text>
                    <Icon name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
                {contactTelHref ? (
                  <TouchableOpacity
                    style={[styles.contactModalRow, { borderColor: 'rgba(255,255,255,0.12)', marginTop: spacing.sm }]}
                    onPress={() => {
                      setContactModalVisible(false);
                      Linking.openURL(`tel:${contactTelHref}`).catch(() => {});
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon name="phone-outline" size={22} color={colors.primary} />
                    <Text style={[typography.bodyMedium, { color: '#FFFFFF', marginLeft: spacing.md, flex: 1 }]}>Telefon ile ara</Text>
                    <Icon name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
                {contactWebsiteUrl ? (
                  <TouchableOpacity
                    style={[styles.contactModalRow, { borderColor: 'rgba(255,255,255,0.12)', marginTop: spacing.sm }]}
                    onPress={() => {
                      setContactModalVisible(false);
                      Linking.openURL(contactWebsiteUrl).catch(() => {});
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon name="web" size={22} color={colors.primary} />
                    <Text style={[typography.bodyMedium, { color: '#FFFFFF', marginLeft: spacing.md, flex: 1 }]}>Web sitesini aç</Text>
                    <Icon name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={{ marginTop: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' }}
                  onPress={() => setContactModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[typography.bodySmallBold, { color: '#9CA3AF' }]}>Kapat</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          <View style={[styles.headerOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
            <Header title="" showBack rightComponent={headerRight} transparent backButtonOverlay alignTop />
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroWrap: { position: 'relative', height: 280 },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  headerRightStack: { alignItems: 'center' },
  headerOverlayBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center' },
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 32,
  },
  contactModalSheet: {
    borderWidth: 1,
    padding: 20,
  },
  contactModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 6,
  },
});

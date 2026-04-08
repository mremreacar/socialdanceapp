import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Share, Modal, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { EmptyState } from '../../components/feedback/EmptyState';
import { MainStackParamList } from '../../types/navigation';
import { scheduleEventReminder } from '../../services/notifications';
import { ApiError } from '../../services/api/apiClient';
import { getSchoolEventDetailsById } from '../../services/api/schoolEvents';
import { schoolEventAttendeesService, type EventAttendee } from '../../services/api/schoolEventAttendees';

type Props = NativeStackScreenProps<MainStackParamList, 'EventDetails'>;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

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

function formatStartsAtRangeLabel(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return '';
  const base = formatStartsAtLabel(startsAt);
  if (!endsAt) return base;

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return base;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${base} - ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `${base} - ${formatStartsAtLabel(endsAt)}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPriceLabel(amount: unknown, currency?: string | null): string | null {
  const value = toFiniteNumber(amount);
  if (value == null) return null;
  if (value <= 0) return 'Ücretsiz';

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

function formatDanceTypeSummary(danceTypes: string[]): string | null {
  const cleaned = danceTypes.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  if (cleaned.length <= 2) return cleaned.join(' • ');
  return `${cleaned.slice(0, 2).join(' • ')} +${cleaned.length - 2}`;
}

export const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [isFavorite, setIsFavorite] = useState(false);
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [danceTypesExpanded, setDanceTypesExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [heroHeight, setHeroHeight] = useState(280);
  const [remoteEvent, setRemoteEvent] = useState<{
    title: string;
    isLesson: boolean;
    dateLabel: string;
    startsAtDate: Date | null;
    venue: string;
    city: string | null;
    openAddress: string;
    image: string;
    description: string;
    danceTypes: string[];
    priceLabel: string | null;
    participantLimit: number | null;
    attendeeCount: number;
  } | null>(null);
  const [dbAttendees, setDbAttendees] = useState<EventAttendee[] | null>(null);

  useEffect(() => {
    if (!isUuid(route.params.id)) {
      setRemoteEvent(null);
      setLoadError('Etkinlik verisi bulunamadı.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    void getSchoolEventDetailsById(route.params.id)
      .then((row) => {
        if (!row) {
          setRemoteEvent(null);
          setLoadError('Etkinlik verisi bulunamadı.');
          return;
        }
        const startsAt = new Date(row.starts_at);
        setRemoteEvent({
          title: row.title?.trim() || 'Etkinlik',
          isLesson: (row.event_type ?? '').trim().toLowerCase() === 'lesson',
          dateLabel: formatStartsAtRangeLabel(row.starts_at, row.ends_at) || '-',
          startsAtDate: Number.isNaN(startsAt.getTime()) ? null : startsAt,
          venue: row.location?.trim() || '-',
          city: row.city?.trim() || null,
          openAddress: row.open_address?.trim() || row.location?.trim() || '-',
          image: row.image_url?.trim() || '',
          description: row.description?.trim() || '',
          danceTypes: row.dance_type_names ?? [],
          priceLabel: formatPriceLabel(row.price_amount, row.price_currency),
          participantLimit: toFiniteNumber(row.participant_limit),
          attendeeCount: row.attendee_count ?? 0,
        });
      })
      .catch(() => {
        setRemoteEvent(null);
        setLoadError('Etkinlik detayları yüklenemedi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [route.params.id]);

  const eventTitle = remoteEvent?.title ?? 'Etkinlik';
  const eventDateLabel = remoteEvent?.dateLabel ?? '-';
  const eventVenue = remoteEvent?.venue ?? '-';
  const eventOpenAddress = remoteEvent?.openAddress ?? '-';
  const eventImage = remoteEvent?.image ?? '';
  const eventDanceTypes = remoteEvent?.danceTypes ?? [];
  const eventDanceTypeLabel = formatDanceTypeSummary(eventDanceTypes);
  const eventPriceLabel = remoteEvent?.priceLabel ?? null;
  const eventCityLabel = remoteEvent?.city ?? null;
  const eventDescription =
    remoteEvent?.description?.trim() ||
    (eventDanceTypeLabel
      ? `${eventTitle} etkinliğinde ${eventDanceTypeLabel} deneyimi seni bekliyor.`
      : `${eventTitle} etkinlik detayları burada yer alır.`);
  const effectiveRawDate = remoteEvent?.startsAtDate ?? null;
  const isDbEvent = isUuid(route.params.id);
  const attendeeList: EventAttendee[] = dbAttendees ?? [];
  const attendingCount = Math.max(remoteEvent?.attendeeCount ?? 0, attendeeList.length);
  const capacity = remoteEvent?.participantLimit ?? 50;
  const visibleDanceTypes = danceTypesExpanded ? eventDanceTypes : eventDanceTypes.slice(0, 3);
  const hiddenDanceTypeCount = Math.max(eventDanceTypes.length - visibleDanceTypes.length, 0);
  const generalInfoItems = [
    { key: 'date', icon: 'calendar-outline' as const, label: 'Tarih', value: eventDateLabel },
    { key: 'city', icon: 'city-variant-outline' as const, label: 'Şehir', value: eventCityLabel },
    { key: 'venue', icon: 'map-marker-outline' as const, label: 'Konum', value: eventVenue },
    { key: 'address', icon: 'map-marker-radius-outline' as const, label: 'Açık Adres', value: remoteEvent?.openAddress?.trim() || null },
    { key: 'price', icon: 'tag-outline' as const, label: 'Ücret', value: eventPriceLabel },
  ].filter((item) => item.value && item.value !== '-');

  useEffect(() => {
    if (!isDbEvent) {
      setDbAttendees(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [list, joined] = await Promise.all([
          schoolEventAttendeesService.list(route.params.id),
          schoolEventAttendeesService.isJoined(route.params.id),
        ]);
        if (cancelled) return;
        setDbAttendees(list);
        setHasJoined(joined);
      } catch {
        if (!cancelled) setDbAttendees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDbEvent, route.params.id]);

  useEffect(() => {
    setDanceTypesExpanded(false);
  }, [route.params.id, eventDanceTypes.length]);

  useEffect(() => {
    if (!eventImage) {
      setHeroHeight(280);
      return;
    }

    let cancelled = false;
    const minHeight = 220;
    const maxHeight = 460;
    const contentWidth = Math.max(windowWidth, 1);

    Image.getSize(
      eventImage,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        const nextHeight = Math.min(Math.max((contentWidth * height) / width, minHeight), maxHeight);
        setHeroHeight(nextHeight);
      },
      () => {
        if (!cancelled) setHeroHeight(280);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [eventImage, windowWidth]);

  const handleJoin = async () => {
    if (isDbEvent) {
      try {
        await schoolEventAttendeesService.join(route.params.id);
        const list = await schoolEventAttendeesService.list(route.params.id);
        setDbAttendees(list);
        setHasJoined(true);
      } catch (e: unknown) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Katılım kaydedilemedi. Giriş yaptığınızdan emin olun.';
        Alert.alert('Katılım', msg);
        return;
      }
    }
    if (effectiveRawDate && !reminderScheduled) {
      const id = await scheduleEventReminder(eventTitle, effectiveRawDate);
      if (id) setReminderScheduled(true);
    }
    setJoinModalVisible(true);
  };

  const handleLeave = () => {
    setLeaveModalVisible(true);
  };

  const confirmLeave = () => {
    if (isDbEvent) {
      void schoolEventAttendeesService.leave(route.params.id)
        .then(() => schoolEventAttendeesService.list(route.params.id))
        .then((list) => {
          setDbAttendees(list);
          setHasJoined(false);
        })
        .catch(() => {});
    }
    setLeaveModalVisible(false);
  };

  const handleShare = () => {
    Share.share({
      message: `${eventTitle}\n${eventDateLabel}\n${eventVenue}\n${eventPriceLabel ?? ''}`,
      title: eventTitle,
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
          if (next && effectiveRawDate) await scheduleEventReminder(eventTitle, effectiveRawDate);
        }}
        style={[styles.headerOverlayBtn, { borderRadius: radius.full, marginTop: 8 }]}
        activeOpacity={0.7}
      >
        <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ConfirmModal
        visible={joinModalVisible}
        title="Teşekkürler!"
        message="Katıldığınızı belirttiğiniz için teşekkürler. Etkinlikte görüşmek üzere!"
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setJoinModalVisible(false)}
        onConfirm={() => setJoinModalVisible(false)}
      />
      <ConfirmModal
        visible={leaveModalVisible}
        title="Vazgeçtiniz"
        message="Katılmaktan vazgeçtiğiniz için üzgünüz. İstediğiniz zaman tekrar katılabilirsiniz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setLeaveModalVisible(false)}
        onConfirm={confirmLeave}
      />
      <Modal
        visible={friendsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={styles.friendsModalOverlay}>
          <TouchableOpacity
            style={styles.friendsModalBackdrop}
            activeOpacity={1}
            onPress={() => setFriendsModalVisible(false)}
          />
          <View style={[styles.friendsModalBox, { backgroundColor: '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>
              Katılımcılar
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {attendeeList.map((attendee, index) => {
                  const name = attendee.name;
                  return (
                    <TouchableOpacity
                      key={attendee.id + index}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFriendsModalVisible(false);
                        navigation.navigate('UserProfile', { userId: attendee.id, name, avatar: attendee.avatar });
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                    >
                      <Avatar source={attendee.avatar} size="sm" />
                      <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.md }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <Button
              title="Kapat"
              variant="secondary"
              fullWidth
              size="md"
              style={{ marginTop: spacing.lg }}
              onPress={() => setFriendsModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg + Math.max(insets.bottom, spacing.md) }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.centerState, { paddingTop: insets.top + 120 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !remoteEvent ? (
          <View style={[styles.centerState, { paddingHorizontal: spacing.lg, paddingTop: insets.top + 120 }]}>
            <EmptyState
              icon="calendar-blank-outline"
              title="Etkinlik verisi bulunamadı."
              subtitle={loadError ?? 'Bu etkinlik backend tarafında bulunamadı ya da erişilemiyor.'}
            />
          </View>
        ) : (
          <>
        <View style={[styles.heroWrap, { height: heroHeight, backgroundColor: colors.headerBg }]}>
          {eventImage ? (
            <Image source={{ uri: eventImage }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.headerBg }]}>
              <Icon name="calendar-blank-outline" size={48} color="rgba(255,255,255,0.7)" />
            </View>
          )}
          <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Text style={[typography.h3, { color: '#FFFFFF' }]}>{eventTitle}</Text>
            <View style={[styles.infoCard, { marginTop: spacing.md, borderRadius: radius.xl, padding: spacing.md }]}>
              {generalInfoItems.map((item, index) => (
                <View key={item.key}>
                  {index > 0 ? <View style={[styles.infoDivider, { marginVertical: spacing.md }]} /> : null}
                  <View style={styles.infoItem}>
                    <View style={[styles.iconBox, styles.infoIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                      <Icon name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={[styles.infoBody, { marginLeft: spacing.sm }]}>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.62)' }]}>{item.label}</Text>
                      <Text style={[typography.bodySmall, styles.infoValue, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>
                        {item.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={[styles.infoDivider, { marginVertical: spacing.md }]} />
              <View style={styles.infoItem}>
                <View style={[styles.iconBox, styles.infoIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="account-group-outline" size={18} color={colors.primary} />
                </View>
                <View style={[styles.infoBody, { marginLeft: spacing.sm }]}>
                  <View style={styles.rowBetween}>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.62)' }]}>Kapasite</Text>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{attendingCount} / {capacity}</Text>
                  </View>
                  <ProgressBar progress={attendingCount / capacity} height={4} style={{ marginTop: 8, width: '100%' }} />
                </View>
              </View>
            </View>
            {eventDanceTypes.length > 0 ? (
              <View style={[styles.danceTypeCard, { marginTop: spacing.md, borderRadius: radius.xl, padding: spacing.md }]}>
                <View style={styles.danceTypeHeader}>
                  <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                      <Icon name="music" size={18} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: spacing.sm }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Dans Türleri</Text>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)' }]}>
                        {eventDanceTypes.length} stil
                      </Text>
                    </View>
                  </View>
                  {eventDanceTypes.length > 3 ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setDanceTypesExpanded((current) => !current)}
                      style={[styles.danceTypeToggle, { borderRadius: radius.full }]}
                    >
                      <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>
                        {danceTypesExpanded ? 'Daralt' : `+${hiddenDanceTypeCount} daha`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={[styles.danceTypeTags, { marginTop: spacing.md }]}>
                  {visibleDanceTypes.map((danceType, index) => (
                    <View
                      key={`${danceType}-${index}`}
                      style={[styles.danceTypeTag, { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}
                    >
                      <Icon name="music-note" size={14} color={colors.primary} />
                      <Text style={[typography.captionBold, { color: '#FFFFFF', marginLeft: 6 }]} numberOfLines={1}>
                        {danceType}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFriendsModalVisible(true)}
            style={[
              styles.friendsBorder,
              {
                marginTop: spacing.xl,
                backgroundColor: '#241C27',
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: 50,
                padding: spacing.lg,
              },
            ]}
          >
            <View style={styles.friendsRow}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Katılımcılar</Text>
              <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.75)' }]}>{attendeeList.length} kişi</Text>
            </View>
            <View style={[styles.avatars, { marginTop: spacing.sm }]}>
              {attendeeList.map((attendee, i) => (
                    <TouchableOpacity
                      key={attendee.id}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('UserProfile', { userId: attendee.id, name: attendee.name, avatar: attendee.avatar });
                      }}
                      style={{ marginRight: 8, marginBottom: 8 }}
                    >
                      <Avatar source={attendee.avatar} size="sm" />
                    </TouchableOpacity>
                  ))}
            </View>
          </TouchableOpacity>

          {!remoteEvent?.isLesson ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('DanceStar', {
                  eventId: route.params.id,
                  eventTitle,
                  attendees: attendeeList,
                })
              }
              activeOpacity={0.8}
              style={[styles.dqBanner, { backgroundColor: colors.purpleAlpha, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg }]}
            >
              <Icon name="crown" size={24} color={colors.purple} />
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.md }]}>DanceStar oylamasına katıl</Text>
              <Icon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: spacing.xl }} />
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Etkinlik açıklaması</Text>
            <Text
              style={[
                typography.bodySmall,
                { color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
              ]}
            >
              {eventDescription}
            </Text>
          </View>
          <View style={{ flex: 1, minHeight: 24 }} />
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.headerBg,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.lg,
                paddingBottom: spacing.lg + Math.max(insets.bottom - spacing.sm, 0),
              },
            ]}
          >
            <Button
              title={hasJoined ? 'Katılmaktan vazgeç' : 'Katıl'}
              onPress={hasJoined ? handleLeave : handleJoin}
              fullWidth
              style={{ borderRadius: 50 }}
            />
          </View>
        </View>
          </>
        )}
      </ScrollView>
      <View style={[styles.headerOverlay, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
        <Header
          title=""
          showBack
          transparent
          backButtonOverlay
          alignTop
          rightComponent={headerRight}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroWrap: { position: 'relative', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconBox: {
    marginTop: 2,
  },
  infoBody: {
    flex: 1,
  },
  infoValue: {
    flexShrink: 1,
    lineHeight: 20,
  },
  danceTypeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  danceTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  danceTypeToggle: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  danceTypeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  danceTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    backgroundColor: 'rgba(75,21,75,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(238,42,238,0.18)',
  },
  friendsBorder: { borderWidth: 1 },
  friendsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatars: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  dqBanner: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center' },
  friendsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  friendsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  friendsModalBox: {
    width: '100%',
    padding: 20,
  },
});

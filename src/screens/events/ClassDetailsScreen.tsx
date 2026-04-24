import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Toast } from '../../components/feedback';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { MainStackParamList } from '../../types/navigation';
import {
  formatLessonPrice,
  formatLessonStartsAt,
  instructorLessonsService,
  instructorScheduleService,
  type InstructorScheduleSlotModel,
  type PublishedInstructorLessonListItem,
} from '../../services/api/instructorLessons';
import { ApiError, hasSupabaseConfig } from '../../services/api/apiClient';
import { instructorLessonReservationsService } from '../../services/api/instructorLessonReservations';
import { storage } from '../../services/storage';
import { addFavoriteEvent, isEventFavorited, removeFavoriteEvent } from '../../services/api/eventFavorites';
import {
  instructorLocationLabel,
  instructorWeekdayLabel,
} from '../instructor/instructorScheduleConstants';

type Props = NativeStackScreenProps<MainStackParamList, 'ClassDetails'>;

type LessonDetailVm = PublishedInstructorLessonListItem & {
  schedule: InstructorScheduleSlotModel[];
};

const CARD_BG = '#311831';
const CARD_BORDER = 'rgba(255,255,255,0.12)';

function buildLessonLocationLabel(lesson: PublishedInstructorLessonListItem): string {
  const primaryParts = [lesson.location?.trim(), lesson.address?.trim()].filter(Boolean);
  const cityPart = lesson.city?.trim();
  if (primaryParts.length > 0 || cityPart) {
    return [...primaryParts, cityPart].filter(Boolean).join(' · ');
  }
  const districtCity = [lesson.schoolDistrict?.trim(), lesson.schoolCity?.trim()].filter(Boolean).join(', ');
  return [lesson.schoolName?.trim(), districtCity].filter(Boolean).join(' · ') || 'Konum bilgisi yakında açıklanacak';
}

function buildLessonTimeLabel(lesson: PublishedInstructorLessonListItem): string | null {
  const startLabel = formatLessonStartsAt(lesson.nextOccurrenceAt);
  if (!startLabel) return null;
  if (!lesson.endsAt) return startLabel;
  const end = new Date(lesson.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} - ${end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

export const ClassDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonDetailVm | null>(null);
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      instructorLessonsService.getPublishedById(route.params.id),
      instructorScheduleService.listByLesson(route.params.id).catch(() => []),
      instructorLessonReservationsService.isJoined(route.params.id).catch(() => false),
    ])
      .then(([lessonRow, schedule, joined]) => {
        if (cancelled) return;
        if (!lessonRow) {
          setLesson(null);
          setError('Ders bulunamadı.');
          return;
        }
        setLesson({
          ...lessonRow,
          schedule,
        });
        setHasJoined(joined);
      })
      .catch(() => {
        if (cancelled) return;
        setLesson(null);
        setError('Ders detayları yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [route.params.id]);

  useEffect(() => {
    if (!lesson?.id || !hasSupabaseConfig()) {
      setIsFavorite(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const favorite = await isEventFavorited(lesson.id);
        if (!cancelled) setIsFavorite(favorite);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lesson?.id]);

  const locationLabel = useMemo(() => (lesson ? buildLessonLocationLabel(lesson) : ''), [lesson]);
  const infoItems = useMemo(() => {
    if (!lesson) return [];
    return [
      { key: 'start', icon: 'calendar-outline' as const, label: 'Tarih', value: formatLessonStartsAt(lesson.nextOccurrenceAt) },
      { key: 'end', icon: 'clock-outline' as const, label: 'Saat', value: buildLessonTimeLabel(lesson) },
      {
        key: 'delivery',
        icon: 'video-outline' as const,
        label: 'Ders formatı',
        value: lesson.deliveryMode === 'online' ? 'Online' : 'Yüz yüze',
      },
      {
        key: 'format',
        icon: 'school-outline' as const,
        label: 'Ders tipi',
        value: lesson.lessonFormat === 'private' ? 'Özel ders' : 'Grup dersi',
      },
      { key: 'price', icon: 'tag-outline' as const, label: 'Ücret', value: formatLessonPrice(lesson) },
      { key: 'capacity', icon: 'account-group-outline' as const, label: 'Katılımcı', value: lesson.participantLimit ? `${lesson.participantLimit} kişi` : 'Sınırsız' },
      { key: 'level', icon: 'chart-line' as const, label: 'Seviye', value: lesson.level || 'Tüm Seviyeler' },
      { key: 'location', icon: 'map-marker-outline' as const, label: 'Konum', value: locationLabel },
    ].filter((item) => item.value);
  }, [lesson, locationLabel]);

  const nextLessonDate = useMemo(() => {
    if (!lesson?.nextOccurrenceAt) return null;
    const d = new Date(lesson.nextOccurrenceAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [lesson?.nextOccurrenceAt]);

  const canLeaveReservation = useMemo(() => {
    if (!hasJoined) return false;
    if (!nextLessonDate) return true;
    return nextLessonDate.getTime() > Date.now();
  }, [hasJoined, nextLessonDate]);

  const handleJoin = async () => {
    if (!lesson || joining || hasJoined) return;
    if (!hasSupabaseConfig()) {
      setToastMessage('Bu özellik için uygulama yapılandırması gerekir.');
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setToastMessage('Derse katılmak için lütfen giriş yapın.');
      return;
    }

    setJoining(true);
    try {
      await instructorLessonReservationsService.join(lesson.id);
      setHasJoined(true);
      setToastMessage('Ders rezervasyonunuz oluşturuldu.');
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Rezervasyon oluşturulamadı.';
      setToastMessage(msg);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!lesson || joining || !hasJoined || !canLeaveReservation) return;
    setJoining(true);
    try {
      await instructorLessonReservationsService.leave(lesson.id);
      setHasJoined(false);
      setToastMessage('Ders rezervasyonunuz iptal edildi.');
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Rezervasyon iptal edilemedi.';
      setToastMessage(msg);
    } finally {
      setJoining(false);
      setLeaveModalVisible(false);
    }
  };

  const toggleFavorite = async () => {
    if (!lesson) return;
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        await addFavoriteEvent(lesson.id);
      } else {
        await removeFavoriteEvent(lesson.id);
      }
    } catch (error: unknown) {
      setIsFavorite(!next);
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Favori işlemi tamamlanamadı.';
      Alert.alert('Favoriler', message);
    }
  };

  return (
    <Screen>
      <Header title="Ders Detayı" showBack />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : error || !lesson ? (
          <View style={{ marginTop: spacing.lg }}>
            <EmptyState
              icon="book-open-page-variant-outline"
              title={error || 'Ders bulunamadı.'}
              subtitle="Lütfen daha sonra tekrar deneyin."
            />
          </View>
        ) : (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: CARD_BG,
                  borderColor: CARD_BORDER,
                  borderRadius: radius.xl,
                  padding: spacing.lg,
                  marginTop: spacing.sm,
                },
              ]}
            >
              <View style={styles.favoriteButtonRow}>
                <TouchableOpacity
                  onPress={() => void toggleFavorite()}
                  activeOpacity={0.8}
                  style={[styles.favoriteButton, { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.full }]}
                >
                  <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
                </TouchableOpacity>
              </View>
              {lesson.imageUrl ? (
                <Image
                  source={{ uri: lesson.imageUrl }}
                  style={[styles.heroCover, { borderRadius: radius.lg, marginBottom: spacing.lg }]}
                />
              ) : null}
              <View style={styles.heroTopRow}>
                <Avatar source={lesson.instructorAvatarUrl || ''} size="lg" showBorder />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.h4, { color: '#FFFFFF' }]}>{lesson.instructorName}</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.72)', marginTop: 4 }]}>
                    {lesson.instructorUsername ? `@${lesson.instructorUsername}` : 'Eğitmen'}
                  </Text>
                </View>
                <View style={[styles.levelChip, { backgroundColor: colors.primaryAlpha20 }]}>
                  <Text style={[typography.captionBold, { color: colors.primary }]}>
                    {lesson.level || 'Tüm Seviyeler'}
                  </Text>
                </View>
              </View>

              <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.lg }]}>
                {lesson.title}
              </Text>
              <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.76)', marginTop: spacing.sm }]}>
                {lesson.description?.trim() || 'Bu ders için açıklama henüz eklenmedi.'}
              </Text>
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
                Ders Bilgileri
              </Text>
              {infoItems.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.infoRow,
                    {
                      backgroundColor: CARD_BG,
                      borderColor: CARD_BORDER,
                      borderRadius: radius.lg,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <Icon name={item.icon} size={18} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)' }]}>{item.label}</Text>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: 4 }]}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {lesson.schedule.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
                  Haftalık Program
                </Text>
                {lesson.schedule.map((slot) => (
                  <View
                    key={slot.id}
                    style={[
                      styles.scheduleCard,
                      {
                        backgroundColor: CARD_BG,
                        borderColor: CARD_BORDER,
                        borderRadius: radius.lg,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <View style={styles.scheduleHeaderRow}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                        {instructorWeekdayLabel(slot.weekday)} · {slot.startTime}
                      </Text>
                      <Text style={[typography.captionBold, { color: colors.primary }]}>
                        {instructorLocationLabel(slot.locationType)}
                      </Text>
                    </View>
                    {slot.address?.trim() ? (
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.72)', marginTop: spacing.xs }]}>
                        {slot.address.trim()}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.ctaRow, { marginTop: spacing.xl }]}>
              <Button
                title="Eğitmen Profilini Gör"
                onPress={() =>
                  navigation.navigate('UserProfile', {
                    userId: lesson.instructorUserId,
                    name: lesson.instructorName,
                    username: lesson.instructorUsername,
                    avatar: lesson.instructorAvatarUrl || '',
                    bio: lesson.description?.trim() || undefined,
                  })
                }
                variant="outline"
                size="lg"
                style={{
                  flex: 1,
                  borderColor: 'rgba(255,255,255,0.28)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                }}
                textStyle={{ color: '#FFFFFF', fontSize: 13, textAlign: 'center' }}
              />
              <Button
                title={hasJoined ? (canLeaveReservation ? 'Vazgeç' : 'Ders Başladı') : 'Derse Katıl'}
                onPress={() => {
                  if (hasJoined) {
                    if (canLeaveReservation) setLeaveModalVisible(true);
                    return;
                  }
                  void handleJoin();
                }}
                disabled={hasJoined && !canLeaveReservation}
                loading={joining}
                size="lg"
                style={{ flex: 1 }}
                textStyle={{ fontSize: 13 }}
              />
            </View>

            {lesson.schoolName ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (!lesson.schoolId) return;
                  navigation.navigate('SchoolDetails', { id: lesson.schoolId });
                }}
                style={[
                  styles.secondaryLink,
                  {
                    borderColor: CARD_BORDER,
                    borderRadius: radius.lg,
                    marginTop: spacing.sm,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Okulu Aç</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}
      <ConfirmModal
        visible={leaveModalVisible}
        title="Rezervasyondan Vazgeç"
        message="Ders başlayana kadar rezervasyonunu iptal edebilirsin. Devam etmek istiyor musun?"
        cancelLabel="Geri Dön"
        confirmLabel="Vazgeç"
        onCancel={() => setLeaveModalVisible(false)}
        onConfirm={() => void handleLeave()}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
  },
  favoriteButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCover: {
    width: '100%',
    height: 190,
    backgroundColor: '#241626',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  scheduleCard: {
    borderWidth: 1,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryLink: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

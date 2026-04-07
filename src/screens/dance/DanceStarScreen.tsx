import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import { danceStarService } from '../../services/api/danceStar';
import {
  schoolEventAttendeesService,
  type EventAttendee,
  type LatestJoinedEvent,
} from '../../services/api/schoolEventAttendees';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Props = NativeStackScreenProps<MainStackParamList, 'DanceStar'>;

type VoteAttendee = EventAttendee & { voted: boolean };

function seedAttendees(routeAttendees: EventAttendee[], currentUserId: string | null): VoteAttendee[] {
  return routeAttendees
    .filter((attendee) => attendee.id !== currentUserId)
    .map((attendee) => ({ ...attendee, voted: false }));
}

export const DanceStarScreen: React.FC<Props> = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();

  const [attendees, setAttendees] = useState<VoteAttendee[]>([]);
  const [latestJoinedEvent, setLatestJoinedEvent] = useState<LatestJoinedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(300);

  const maxVotes = 1;
  const usedVotes = attendees.filter((a) => a.voted).length;
  const selectedAttendee = attendees.find((a) => a.voted) ?? null;
  const eventTitle = latestJoinedEvent?.event.title?.trim() || 'Son katıldığın etkinlik';
  const hasLatestJoinedEvent = !!latestJoinedEvent?.event.id;

  const loadAttendees = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const latest = await schoolEventAttendeesService.getLatestJoinedEvent();
      setLatestJoinedEvent(latest);
      if (!latest?.event.id) {
        setAttendees([]);
        setLoading(false);
        return;
      }

      const [me, list] = await Promise.all([
        schoolEventAttendeesService.getCurrentUserId(),
        schoolEventAttendeesService.list(latest.event.id),
      ]);
      setAttendees(seedAttendees(list, me));
      setVoteSubmitted(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Katılımcılar yüklenemedi.';
      setLoadError(message);
      setAttendees([]);
      setLatestJoinedEvent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendees();
  }, [loadAttendees]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleVote = (id: string) => {
    if (!hasLatestJoinedEvent || voteSubmitted) return;
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, voted: !a.voted };
        }
        return maxVotes === 1 ? { ...a, voted: false } : a;
      }),
    );
  };

  const clearVote = () => {
    if (!selectedAttendee || voteSubmitted) return;
    setAttendees((prev) => prev.map((a) => ({ ...a, voted: false })));
  };

  const submitVote = useCallback(async () => {
    const eventId = latestJoinedEvent?.event.id;
    if (!selectedAttendee || !eventId || !hasLatestJoinedEvent || voteSubmitted || submittingVote) return;
    setSubmittingVote(true);
    try {
      await danceStarService.submitVote(eventId, selectedAttendee.id);
      setVoteSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Oy gönderilemedi.';
      Alert.alert('Oy gönderilemedi', message);
    } finally {
      setSubmittingVote(false);
    }
  }, [hasLatestJoinedEvent, latestJoinedEvent, selectedAttendee, submittingVote, voteSubmitted]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  const content = useMemo(() => {
    if (!hasLatestJoinedEvent && !loading && !loadError) {
      return (
        <EmptyState
          icon="calendar-blank-outline"
          title="Henüz katıldığın etkinlik yok."
          subtitle="DanceStar, son katıldığın etkinliğin katılımcılarını burada listeler."
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (loadError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Katılımcılar yüklenemedi."
          subtitle={loadError}
          actionLabel="Tekrar dene"
          onAction={() => void loadAttendees()}
        />
      );
    }

    if (attendees.length === 0) {
      return (
        <EmptyState
          icon="heart-outline"
          title="Oylama için başka katılımcı yok."
          subtitle="Son katıldığın etkinlikte senden başka katılımcı olduğunda burada listelenecek."
        />
      );
    }

    return (
      <>
        <View
          style={[
            styles.listHeader,
            {
              backgroundColor: '#2B1730',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              marginBottom: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Katılımcı listesi</Text>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
            Son katıldığın etkinlikteki herkes burada listelenir, bir kişiye oy verebilirsin.
          </Text>
        </View>

        {attendees.map((attendee) => {
          const cardStyle = {
            backgroundColor: '#2B1730',
            borderRadius: 14,
            borderColor: attendee.voted ? colors.primary : 'rgba(255,255,255,0.1)',
            borderWidth: attendee.voted ? 2 : 1,
            paddingVertical: 10,
            paddingHorizontal: 12,
          } as const;

          return (
            <TouchableOpacity
              key={attendee.id}
              onPress={() => toggleVote(attendee.id)}
              activeOpacity={0.8}
              disabled={voteSubmitted}
              style={{ marginBottom: spacing.sm, opacity: voteSubmitted && !attendee.voted ? 0.6 : 1 }}
            >
              <Card style={cardStyle} padded={false}>
                <View style={styles.attendeeRow}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('UserProfile', { userId: attendee.id, name: attendee.name, avatar: attendee.avatar });
                    }}
                    activeOpacity={0.8}
                  >
                    <Avatar source={attendee.avatar} size="md" />
                  </TouchableOpacity>
                  <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{attendee.name}</Text>
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
                      Katılımcı
                    </Text>
                  </View>
                  {attendee.voted ? (
                    <Icon name="check-circle" size={24} color={colors.primary} />
                  ) : (
                    <View style={[styles.voteBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: 18 }]}>
                      <Icon name="vote" size={18} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {selectedAttendee && !voteSubmitted ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Seçilen kişi: {selectedAttendee.name}
            </Text>
            <TouchableOpacity
              onPress={() => void submitVote()}
              activeOpacity={0.85}
              disabled={submittingVote}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: spacing.md,
                alignItems: 'center',
                marginBottom: spacing.sm,
                opacity: submittingVote ? 0.7 : 1,
              }}
            >
              {submittingVote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF', letterSpacing: 0.3 }]}>Oyu Gönder</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearVote}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#4B154B',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#C084FC',
                paddingVertical: spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', letterSpacing: 0.3 }]}>Oyu geri al</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedAttendee && voteSubmitted ? (
          <View
            style={{
              marginTop: spacing.sm,
              backgroundColor: 'rgba(52,211,153,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(52,211,153,0.35)',
              borderRadius: 12,
              padding: spacing.md,
            }}
          >
            <Text style={[typography.bodySmallBold, { color: '#86EFAC' }]}>Oyun gönderildi</Text>
            <Text style={[typography.caption, { color: '#D1FAE5', marginTop: 4 }]}>
              Seçimin kaydedildi: {selectedAttendee.name}
            </Text>
          </View>
        ) : null}
      </>
    );
  }, [
    attendees,
    colors.primary,
    colors.surfaceSecondary,
    colors.textSecondary,
    hasLatestJoinedEvent,
    loadAttendees,
    loadError,
    loading,
    navigation,
    selectedAttendee,
    submitVote,
    submittingVote,
    spacing.md,
    typography.bodyBold,
    typography.bodySmallBold,
    typography.caption,
    typography.bodySmall,
    voteSubmitted,
  ]);

  return (
    <Screen>
      <Header title="DanceStar" showBack />

      <View
        style={[
          styles.timerBar,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            backgroundColor: colors.headerBg,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.timerTopRow}>
          <View>
            <Text style={[typography.captionBold, { color: '#C084FC' }]}>
              Oylama süresi
            </Text>
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
              Son etkinliğin katılımcıları
            </Text>
          </View>
          <View
            style={[
              styles.timerBadge,
              {
                borderRadius: 999,
                backgroundColor: '#2B1730',
                borderColor: 'rgba(192,132,252,0.28)',
              },
            ]}
          >
            <Icon name="timer-outline" size={14} color="#C084FC" />
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>
              {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.progressCard,
            {
              marginTop: spacing.sm,
              borderRadius: 14,
              backgroundColor: 'rgba(43,23,48,0.72)',
              borderColor: 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {usedVotes} / {maxVotes} oy kullandın
            </Text>
            <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>
              {eventTitle}
            </Text>
          </View>
          <ProgressBar progress={usedVotes / maxVotes} color={colors.primary} style={{ marginTop: 8 }} />
        </View>

      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  timerBar: {},
  timerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressCard: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listHeader: {
    borderWidth: 1,
  },
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },
  voteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

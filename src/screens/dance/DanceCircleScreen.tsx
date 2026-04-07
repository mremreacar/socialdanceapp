import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import {
  danceCircleService,
  DanceCircleCandidate,
  DanceCircleEventWindow,
  DanceCircleListReason,
} from '../../services/api/danceCircle';
import { hasSupabaseConfig } from '../../services/api/apiClient';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const SCREEN = Dimensions.get('window');
const CARD_WIDTH = SCREEN.width - 40;
const CARD_HEIGHT = Math.min(470, Math.max(420, SCREEN.height - 360));
const SWIPE_THRESHOLD = 120;

function formatEventTimestamp(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCompactEventTimestamp(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEmptyStateCopy(reason: DanceCircleListReason, voteWindowOpen: boolean) {
  if (reason === 'missing-event') {
    return {
      title: 'Önce bir etkinliğe katılmalısın.',
      subtitle: 'Dance Circle, son katıldığın etkinliğin ilk 24 saatinde açılır.',
    };
  }
  if (reason === 'expired-window') {
    return {
      title: '24 saatlik seçim süresi kapandı.',
      subtitle: 'Yeni bir etkinliğe katıldığında Dance Circle yeniden açılacak.',
    };
  }
  if (reason === 'no-other-attendees') {
    return {
      title: 'Bu etkinlikte gösterilecek başka katılımcı yok.',
      subtitle: 'Yeni katılımcılar olduğunda burada görünecekler.',
    };
  }
  if (voteWindowOpen) {
    return {
      title: 'Bu etkinlik için değerlendirilecek yeni profil kalmadı.',
      subtitle: 'Dilersen oyları sıfırlayıp listeyi yeniden başlatabilirsin.',
    };
  }
  return {
    title: 'Şimdilik gösterilecek profil yok.',
    subtitle: 'Yeni etkinliklerden sonra Dance Circle burada yeniden açılır.',
  };
}

export const DanceCircleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { spacing, colors, radius, typography } = useTheme();
  const [candidates, setCandidates] = useState<DanceCircleCandidate[]>([]);
  const [eventWindow, setEventWindow] = useState<DanceCircleEventWindow | null>(null);
  const [listReason, setListReason] = useState<DanceCircleListReason>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);
  const [eventInfoExpanded, setEventInfoExpanded] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();
  const current = candidates[index];
  const next = candidates[index + 1];

  const loadCandidates = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (!hasSupabaseConfig()) {
      setError('Supabase yapılandırması eksik.');
      setCandidates([]);
      setEventWindow(null);
      setListReason(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await danceCircleService.listCandidates();
      setCandidates(result.candidates);
      setEventWindow(result.eventWindow);
      setListReason(result.reason);
      setIndex(0);
      setLikedCount(0);
      setDislikedCount(0);
      pan.setValue({ x: 0, y: 0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dans listesi yüklenemedi.';
      setError(msg);
      setCandidates([]);
      setEventWindow(null);
      setListReason(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    setEventInfoExpanded(false);
  }, [eventWindow?.eventId]);

  const cardRotate = pan.x.interpolate({
    inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [24, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -24],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const voteWindowOpen = !!eventWindow?.voteWindowOpen;

  const sendToNextCard = useCallback((direction: 'left' | 'right') => {
    if (!current || !voteWindowOpen) return;
    const toX = direction === 'right' ? CARD_WIDTH * 1.3 : -CARD_WIDTH * 1.3;
    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      void danceCircleService.submitVote(current.id, direction === 'right' ? 'like' : 'skip');
      if (direction === 'right') setLikedCount((v) => v + 1);
      if (direction === 'left') setDislikedCount((v) => v + 1);
      pan.setValue({ x: 0, y: 0 });
      setIndex((v) => v + 1);
    });
  }, [current, pan, voteWindowOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => voteWindowOpen,
        onMoveShouldSetPanResponder: (_, g) => voteWindowOpen && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          if (!voteWindowOpen) return;
          pan.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_, g) => {
          if (!voteWindowOpen) return;
          if (g.dx > SWIPE_THRESHOLD) {
            sendToNextCard('right');
            return;
          }
          if (g.dx < -SWIPE_THRESHOLD) {
            sendToNextCard('left');
            return;
          }
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
        },
      }),
    [pan, sendToNextCard, voteWindowOpen],
  );

  const emptyStateCopy = getEmptyStateCopy(listReason, voteWindowOpen);

  return (
    <Screen>
      <Header
        title="Dance Circle"
        showBack={false}
        showMenu
        onMenuPress={openDrawer}
        showNotification
        onNotificationPress={() => (navigation.getParent() as any)?.navigate('Notifications')}
      />

      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => void loadCandidates()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setEventInfoExpanded((currentState) => !currentState)}
              style={[
                styles.eventInfoCard,
                {
                  marginBottom: spacing.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radius.xl,
                  backgroundColor: colors.headerBg,
                  borderColor: 'rgba(255,255,255,0.08)',
                },
              ]}
            >
              <View style={styles.eventInfoTopRow}>
                <View style={[styles.eventInfoIconWrap, { backgroundColor: colors.primaryAlpha30, borderRadius: radius.full }]}>
                  <Icon name="calendar-star" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.captionBold, { color: colors.primary }]}>Son etkinlik</Text>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: 2 }]} numberOfLines={1}>
                    {eventWindow?.eventTitle ?? 'Henüz etkinlik yok'}
                  </Text>
                </View>
                <View style={styles.eventInfoActions}>
                  <View
                    style={[
                      styles.eventStatusBadge,
                      {
                        backgroundColor: voteWindowOpen ? 'rgba(134,239,172,0.14)' : 'rgba(252,165,165,0.14)',
                        borderColor: voteWindowOpen ? 'rgba(134,239,172,0.35)' : 'rgba(252,165,165,0.35)',
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <Text style={[typography.captionBold, { color: voteWindowOpen ? '#86EFAC' : '#FCA5A5' }]}>
                      {voteWindowOpen ? 'Açık' : 'Kapalı'}
                    </Text>
                  </View>
                  <Icon
                    name={eventInfoExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="rgba(255,255,255,0.75)"
                    style={{ marginLeft: spacing.xs }}
                  />
                </View>
              </View>

              {eventInfoExpanded ? (
                <View style={[styles.eventMetaRow, { marginTop: spacing.sm }]}>
                  <View style={styles.eventMetaItem}>
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>Katılım</Text>
                    <Text style={[typography.captionBold, { color: '#FFFFFF', marginTop: 2 }]}>
                      {formatCompactEventTimestamp(eventWindow?.joinedAt ?? null)}
                    </Text>
                  </View>
                  <View style={[styles.eventMetaDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                  <View style={styles.eventMetaItem}>
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>
                      {voteWindowOpen ? 'Son saat' : 'Bitiş'}
                    </Text>
                    <Text
                      style={[
                        typography.captionBold,
                        { color: voteWindowOpen ? '#86EFAC' : '#FCA5A5', marginTop: 2 },
                      ]}
                    >
                      {formatCompactEventTimestamp(eventWindow?.voteDeadlineAt ?? null)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              {voteWindowOpen && next ? (
                <View style={[styles.cardBase, styles.nextCard, { borderRadius: radius.xl, backgroundColor: colors.headerBg }]}>
                  {next.avatar.trim() ? (
                    <Image source={{ uri: next.avatar }} style={styles.image} />
                  ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryAlpha30 }]}>
                      <Icon name="account" size={88} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.gradientOverlay} />
                </View>
              ) : null}

              {voteWindowOpen && current ? (
                <Animated.View
                  {...panResponder.panHandlers}
                  style={[
                    styles.cardBase,
                    {
                      borderRadius: radius.xl,
                      backgroundColor: colors.headerBg,
                      transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: cardRotate }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.95}
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        userId: current.id,
                        name: current.name,
                        username: current.username,
                        avatar: current.avatar,
                        bio: current.bio,
                      })
                    }
                  >
                    {current.avatar.trim() ? (
                      <Image source={{ uri: current.avatar }} style={styles.image} />
                    ) : (
                      <View style={[styles.imagePlaceholder, { backgroundColor: colors.primaryAlpha30 }]}>
                        <Icon name="account" size={96} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={styles.gradientOverlay} />
                    <View style={styles.swipeBadgeOverlay} pointerEvents="none">
                      <Animated.View style={[styles.swipeBadge, styles.swipeBadgeLike, { opacity: likeOpacity }]}>
                        <Icon name="thumb-up" size={18} color="#34D399" />
                        <Text style={styles.swipeBadgeLikeText}>Dans ettim</Text>
                      </Animated.View>
                      <Animated.View style={[styles.swipeBadge, styles.swipeBadgeNope, { opacity: nopeOpacity }]}>
                        <Icon name="close" size={18} color="#F87171" />
                        <Text style={styles.swipeBadgeNopeText}>Dans etmedim</Text>
                      </Animated.View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={[typography.h3, { color: '#FFFFFF' }]}>{current.name}</Text>
                      <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginTop: 4 }]}>
                        @{current.username} · {current.city} · {current.level}
                      </Text>
                      <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.95)', marginTop: 10 }]}>
                        Hakkında
                      </Text>
                      <Text style={[typography.bodySmall, { color: '#FFFFFF', marginTop: 4 }]}>{current.bio}</Text>
                      <Text style={[typography.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 10 }]}>
                        {current.danceStyles.join(' • ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <EmptyState icon="heart-outline" title={emptyStateCopy.title} subtitle={emptyStateCopy.subtitle} />
              )}
            </View>

            {voteWindowOpen && current ? (
              <View style={[styles.footerInfo, { paddingBottom: insets.bottom + 4 }]}>
                <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                  Sağa kaydır: dans ettim • Sola kaydır: dans etmedim
                </Text>
                <View style={styles.hintRow}>
                  <Text style={[typography.caption, { color: colors.textTertiary, flex: 1 }]}>
                    Dans ettim: {likedCount} · Dans etmedim: {dislikedCount}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: 'visible',
    alignSelf: 'center',
  },
  nextCard: {
    transform: [{ scale: 0.96 }, { translateY: 12 }],
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  swipeBadgeOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -22,
    zIndex: 20,
  },
  swipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(12,12,12,0.72)',
  },
  swipeBadgeLike: {
    borderColor: 'rgba(52,211,153,0.9)',
    position: 'absolute',
  },
  swipeBadgeNope: {
    borderColor: 'rgba(248,113,113,0.9)',
    position: 'absolute',
  },
  swipeBadgeLikeText: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  swipeBadgeNopeText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  cardContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  footerInfo: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoCard: {
    borderWidth: 1,
  },
  eventInfoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventInfoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventInfoIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventStatusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  eventMetaItem: {
    flex: 1,
  },
  eventMetaDivider: {
    width: 1,
    marginHorizontal: 12,
  },
});

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
import { danceCircleService, DanceCircleCandidate } from '../../services/api/danceCircle';
import { hasSupabaseConfig } from '../../services/api/apiClient';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const CARD_WIDTH = Dimensions.get('window').width - 40;
const SWIPE_THRESHOLD = 120;

export const DanceCircleScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { spacing, colors, radius, typography } = useTheme();
  const [candidates, setCandidates] = useState<DanceCircleCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();
  const current = candidates[index];
  const next = candidates[index + 1];

  const loadCandidates = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setError('Supabase yapılandırması eksik.');
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await danceCircleService.listCandidates();
      setCandidates(rows);
      setIndex(0);
      setLikedCount(0);
      setDislikedCount(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dans listesi yüklenemedi.';
      setError(msg);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const cardRotate = pan.x.interpolate({
    inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const sendToNextCard = useCallback((direction: 'left' | 'right') => {
    if (!current) return;
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
  }, [current, pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_, g) => {
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
    [pan, sendToNextCard],
  );

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
        <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          Sağa kaydır: dansını beğen • Sola kaydır: geç
        </Text>
        <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Beğenilen: {likedCount} · Geçilen: {dislikedCount}
        </Text>

        <View style={{ flex: 1 }}>
          {next ? (
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

          {current ? (
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
                <Animated.View style={[styles.edgeIndicator, styles.likeEdge, { opacity: likeOpacity }]}>
                  <Icon name="thumb-up" size={22} color="#34D399" />
                  <Text style={styles.edgeLabelLike}>SEÇTİM</Text>
                </Animated.View>
                <Animated.View style={[styles.edgeIndicator, styles.nopeEdge, { opacity: nopeOpacity }]}>
                  <Icon name="close" size={24} color="#F87171" />
                  <Text style={styles.edgeLabelNope}>GEÇTİM</Text>
                </Animated.View>

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
            <EmptyState icon="heart-outline" title="Şimdilik gösterilecek profil yok." />
          )}
        </View>

        {current ? <View style={{ marginBottom: spacing.md + insets.bottom }} /> : null}
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
    height: 500,
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
  cardContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  edgeIndicator: {
    position: 'absolute',
    top: '50%',
    minWidth: 52,
    height: 62,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 2.5,
    borderRadius: 31,
    backgroundColor: 'rgba(0,0,0,0.88)',
    zIndex: 20,
    marginTop: -31,
  },
  likeEdge: {
    right: -14,
    borderColor: '#34D399',
  },
  nopeEdge: {
    left: -14,
    borderColor: '#F87171',
  },
  edgeLabelLike: {
    color: '#34D399',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  edgeLabelNope: {
    color: '#F87171',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
});


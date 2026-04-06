import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { followService } from '../../services/api/follows';
import { profileService, type PublicProfileCard } from '../../services/api/profile';
import { instructorProfileService, type ExploreInstructorListItem } from '../../services/api/instructorProfile';
import {
  formatLessonPrice,
  formatLessonStartsAt,
  instructorLessonsService,
  instructorScheduleService,
  InstructorLessonModel,
  InstructorScheduleSlotModel,
} from '../../services/api/instructorLessons';
import {
  instructorLocationLabel,
  instructorWeekdayLabel,
} from '../instructor/instructorScheduleConstants';
import { instructorMediaService, type InstructorMediaItem } from '../../services/api/instructorMedia';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';

type Props = NativeStackScreenProps<MainStackParamList, 'UserProfile'>;

const CARD_BG = '#311831';
const CARD_BORDER = 'rgba(255,255,255,0.12)';

function isLikelyUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

const mockDances = ['Salsa', 'Bachata', 'Kizomba'];
const mockRecentEvents = [
  { id: '1', title: 'Latino Night', date: 'Cuma, 22:00' },
  { id: '2', title: 'Salsa Workshop', date: 'Perşembe, 19:00' },
];

const GALLERY_THUMB_W = 132;
const GALLERY_THUMB_H = 168;

export const ViewUserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const { userId, name, username, avatar, bio } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfileCard | null>(null);
  const [instructor, setInstructor] = useState<ExploreInstructorListItem | null>(null);
  const [instructorGallery, setInstructorGallery] = useState<InstructorMediaItem[]>([]);
  const [galleryFocus, setGalleryFocus] = useState<InstructorMediaItem | null>(null);
  const [lessons, setLessons] = useState<InstructorLessonModel[]>([]);
  const [slotsByLesson, setSlotsByLesson] = useState<Map<string, InstructorScheduleSlotModel[]>>(new Map());

  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const useRemote = hasSupabaseConfig() && isLikelyUuid(userId);

  const displayName = (publicProfile?.displayName || name || '').trim() || 'Kullanıcı';
  const displayUsername = (publicProfile?.username || username || '').trim().replace(/^@/, '');
  const displayAvatar = publicProfile?.avatarUrl || avatar || '';
  const headline = instructor?.headline?.trim() ?? '';
  const bioText =
    (instructor?.instructorBio || publicProfile?.bio || bio || '').trim() ||
    'Bu kullanıcı henüz bir şey yazmamış.';

  const { resolveCompact } = useDanceCatalog();
  const danceTags = useMemo(() => {
    if (instructor?.specialties?.length) return instructor.specialties;
    if (publicProfile?.favoriteDances?.length) return resolveCompact(publicProfile.favoriteDances);
    return null;
  }, [instructor?.specialties, publicProfile?.favoriteDances, resolveCompact]);

  const load = useCallback(async () => {
    if (!useRemote) {
      setPublicProfile(null);
      setInstructor(null);
      setInstructorGallery([]);
      setLessons([]);
      setSlotsByLesson(new Map());
      setFollowCounts({ following: 24, followers: 18 });
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    try {
      const [card, inst, counts, following] = await Promise.all([
        profileService.getPublicProfileById(userId),
        instructorProfileService.getVisibleByUserId(userId),
        followService.getFollowCountsForUser(userId),
        followService.isFollowing(userId),
      ]);

      setPublicProfile(card);
      setInstructor(inst);
      setFollowCounts({ following: counts.following, followers: counts.followers });
      setIsFollowing(following);

      if (inst) {
        const [list, gallery] = await Promise.all([
          instructorLessonsService.listPublishedByInstructor(userId),
          instructorMediaService.listForPublishedProfile(userId),
        ]);
        setLessons(list);
        setInstructorGallery(gallery);
        const slotLists = await Promise.all(list.map((l) => instructorScheduleService.listByLesson(l.id)));
        const map = new Map<string, InstructorScheduleSlotModel[]>();
        list.forEach((l, i) => {
          map.set(l.id, slotLists[i] ?? []);
        });
        setSlotsByLesson(map);
      } else {
        setLessons([]);
        setInstructorGallery([]);
        setSlotsByLesson(new Map());
      }
    } catch {
      setPublicProfile(null);
      setInstructor(null);
      setInstructorGallery([]);
      setLessons([]);
      setSlotsByLesson(new Map());
    } finally {
      setLoading(false);
    }
  }, [userId, useRemote]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = async () => {
    if (refreshing || !useRemote) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!useRemote || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await followService.unfollowUser(userId);
        setIsFollowing(false);
        setFollowCounts((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
      } else {
        await followService.followUser(userId);
        setIsFollowing(true);
        setFollowCounts((s) => ({ ...s, followers: s.followers + 1 }));
      }
    } catch {
      // sessiz; tekrar yükle
      void load();
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="" showBack />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          useRemote ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor="rgba(0,0,0,0.25)"
              progressViewOffset={80}
            />
          ) : undefined
        }
      >
        {loading && useRemote ? (
          <ActivityIndicator color={colors.primary} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
        ) : null}

        <View style={styles.topSection}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <Avatar source={displayAvatar} size="xl" showBorder />
          </View>
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>{displayName}</Text>
          {headline ? (
            <Text style={[typography.bodySmall, { color: colors.primary, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.md }]}>
              {headline}
            </Text>
          ) : null}
          {displayUsername ? (
            <Text style={[typography.bodySmall, { color: '#9CA3AF', marginTop: 4 }]}>@{displayUsername}</Text>
          ) : null}
          <Text
            style={[
              typography.bodySmall,
              { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.sm },
            ]}
          >
            {bioText}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => void handleFollowToggle()}
              activeOpacity={0.8}
              disabled={!useRemote || followBusy}
              style={[
                styles.followBtn,
                {
                  backgroundColor: isFollowing ? 'transparent' : colors.primary,
                  borderWidth: 1,
                  borderColor: isFollowing ? '#9CA3AF' : colors.primary,
                  borderRadius: 50,
                  opacity: !useRemote ? 0.5 : 1,
                },
              ]}
            >
              {followBusy ? (
                <ActivityIndicator color={isFollowing ? '#9CA3AF' : '#FFFFFF'} size="small" />
              ) : (
                <Text style={[typography.bodySmallBold, { color: isFollowing ? '#9CA3AF' : '#FFFFFF' }]}>
                  {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  id: String(userId),
                  name: displayName,
                  avatar: displayAvatar,
                  isNewChat: true,
                })
              }
              style={[
                styles.followBtn,
                { backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 50, marginLeft: spacing.sm },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="message-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Mesaj</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.statsRow,
            { backgroundColor: CARD_BG, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: CARD_BORDER },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{followCounts.following}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>Takip Edilen</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: CARD_BORDER }]} />
          <View style={styles.statItem}>
            <Text style={[typography.h4, { color: '#FFFFFF' }]}>{followCounts.followers}</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>Takipçi</Text>
          </View>
        </View>

        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          {instructor?.specialties?.length ? 'Uzmanlık / branşlar' : 'Favori danslar'}
        </Text>
        <View style={styles.tagsRow}>
          {(useRemote && danceTags && danceTags.length > 0 ? danceTags : !useRemote ? mockDances : []).map((dance) => (
            <View key={dance} style={[styles.tag, { backgroundColor: CARD_BG, borderRadius: radius.full, borderWidth: 1, borderColor: CARD_BORDER }]}>
              <Icon name="music" size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{dance}</Text>
            </View>
          ))}
          {useRemote && (!danceTags || danceTags.length === 0) ? (
            <Text style={[typography.caption, { color: '#9CA3AF' }]}>Henüz eklenmemiş.</Text>
          ) : null}
        </View>

        {instructor && instructorGallery.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Medya</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
            >
              {instructorGallery.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => setGalleryFocus(item)}
                  style={{
                    width: GALLERY_THUMB_W,
                    height: GALLERY_THUMB_H,
                    borderRadius: radius.lg,
                    overflow: 'hidden',
                    backgroundColor: CARD_BG,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                  }}
                >
                  <Image source={{ uri: item.publicUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {instructor && lessons.length > 0 ? (
          <>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>Yayında olan dersler</Text>
            {lessons.map((lesson) => {
              const slots = slotsByLesson.get(lesson.id) ?? [];
              const startsLabel = formatLessonStartsAt(lesson.startsAt);
              return (
                <View
                  key={lesson.id}
                  style={{
                    backgroundColor: CARD_BG,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{lesson.title}</Text>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>
                    {lesson.level} · {formatLessonPrice(lesson)}
                  </Text>
                  {startsLabel ? (
                    <Text style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>{startsLabel}</Text>
                  ) : null}
                  {lesson.description?.trim() ? (
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 6 }]} numberOfLines={3}>
                      {lesson.description.trim()}
                    </Text>
                  ) : null}
                  {slots.length > 0 ? (
                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={[typography.captionBold, { color: 'rgba(255,255,255,0.55)', marginBottom: 4 }]}>Haftalık program</Text>
                      {slots.slice(0, 6).map((s) => (
                        <Text key={s.id} style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
                          {instructorWeekdayLabel(s.weekday)} {s.startTime} · {instructorLocationLabel(s.locationType)}
                          {s.address ? ` · ${s.address}` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}

        {!useRemote ? (
          <>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
              Son katıldığı etkinlikler
            </Text>
            {mockRecentEvents.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('EventDetails', { id: ev.id })}
                style={[styles.eventCard, { backgroundColor: CARD_BG, borderRadius: radius.lg, borderWidth: 1, borderColor: CARD_BORDER, padding: spacing.md, marginBottom: spacing.sm }]}
              >
                <View style={styles.eventRow}>
                  <View style={[styles.eventIconWrap, { backgroundColor: colors.primaryAlpha20 ?? 'rgba(238,42,238,0.2)', borderRadius: radius.md }]}>
                    <Icon name="calendar-check" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{ev.title}</Text>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{ev.date}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : instructor && lessons.length === 0 ? (
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.lg }]}>
            Bu eğitmenin yayında dersi henüz yok.
          </Text>
        ) : null}
      </ScrollView>

      <Modal visible={!!galleryFocus} transparent animationType="fade" onRequestClose={() => setGalleryFocus(null)}>
        <View style={styles.galleryOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGalleryFocus(null)} />
          {galleryFocus ? (
            <View style={[styles.galleryModalInner, { maxWidth: windowW - spacing.lg * 2 }]} pointerEvents="box-none">
              <View style={{ position: 'relative', width: '100%' }}>
                <Image
                  source={{ uri: galleryFocus.publicUrl }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg }}
                  contentFit="contain"
                />
                <TouchableOpacity
                  onPress={() => setGalleryFocus(null)}
                  style={[styles.galleryCloseBtn, { top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full }]}
                  hitSlop={12}
                >
                  <Icon name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 24 },
  topSection: { alignItems: 'center' },
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  actionRow: { flexDirection: 'row', marginTop: 20 },
  followBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  eventCard: {},
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  eventIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  galleryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  galleryModalInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCloseBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

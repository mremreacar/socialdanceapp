import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { Avatar } from '../../components/ui/Avatar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { SearchBar } from '../../components/domain/SearchBar';
import { UserListItem } from '../../components/domain/UserListItem';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Icon } from '../../components/ui/Icon';
import { followService, type FollowListUser } from '../../services/api/follows';
import { danceCircleService, type DancedWithPerson } from '../../services/api/danceCircle';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import { instructorProfileService } from '../../services/api/instructorProfile';
import { creatorSchoolEventsService } from '../../services/api/schoolEvents';

const ProfileInfoRow: React.FC<{
  label: string;
  value: string;
  multiline?: boolean;
}> = ({ label, value, multiline }) => {
  const { typography, spacing, colors } = useTheme();
  const display = value.trim() ? value : '—';
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 4 }]}>{label}</Text>
      <Text
        style={[
          multiline ? typography.bodySmall : typography.bodyMedium,
          { color: '#FFFFFF', lineHeight: multiline ? 22 : undefined },
        ]}
      >
        {display}
      </Text>
    </View>
  );
};

function isSupabasePublicAvatarUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri) && uri.includes('/storage/v1/object/public/');
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, avatarSource, refreshProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following');
  const [dancedWithList, setDancedWithList] = useState<DancedWithPerson[]>([]);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ userId: string; userName: string } | null>(null);
  const [followingList, setFollowingList] = useState<FollowListUser[]>([]);
  const [followersList, setFollowersList] = useState<FollowListUser[]>([]);
  const [followListsLoading, setFollowListsLoading] = useState(false);
  const [followActionBusyIds, setFollowActionBusyIds] = useState<Set<string>>(new Set());
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number }>({ following: 0, followers: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [roleLabel, setRoleLabel] = useState<string>('');
  const [dancedModalVisible, setDancedModalVisible] = useState(false);
  const [followListModalVisible, setFollowListModalVisible] = useState(false);
  const [followListSearchQuery, setFollowListSearchQuery] = useState('');
  const shouldShowAvatarWarning = !!profile.avatarUri && !isSupabasePublicAvatarUrl(profile.avatarUri);
  const { resolveFull } = useDanceCatalog();
  const favoriteDancesLabels = useMemo(
    () => resolveFull(profile.favoriteDances ?? []),
    [resolveFull, profile.favoriteDances],
  );

  const rawFollowListForModal = useMemo(
    () => (activeTab === 'following' ? followingList : followersList),
    [activeTab, followingList, followersList],
  );

  const filteredFollowList = useMemo(() => {
    const q = followListSearchQuery.trim();
    if (!q) return rawFollowListForModal;
    const nq = q.toLocaleLowerCase('tr-TR');
    return rawFollowListForModal.filter((u) => {
      const name = u.name.toLocaleLowerCase('tr-TR');
      const uname = (u.handle.startsWith('@') ? u.handle.slice(1) : u.handle).toLocaleLowerCase('tr-TR');
      return name.includes(nq) || uname.includes(nq);
    });
  }, [rawFollowListForModal, followListSearchQuery]);

  const followingIdSet = useMemo(() => new Set(followingList.map((u) => u.id)), [followingList]);

  useEffect(() => {
    if (!followListModalVisible) setFollowListSearchQuery('');
  }, [followListModalVisible]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const loadDancedWith = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setDancedWithList([]);
      return;
    }
    try {
      const rows = await danceCircleService.listMyDancedWith();
      setDancedWithList(rows);
    } catch {
      setDancedWithList([]);
    }
  }, []);

  const loadRoleLabel = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setRoleLabel('');
      return;
    }
    try {
      const [instructorProfile, publishPermission] = await Promise.all([
        instructorProfileService.getMine().catch(() => null),
        creatorSchoolEventsService.getMyPublishPermission().catch(() => ({ canPublishWithoutApproval: false, grantedBySchoolId: null })),
      ]);
      const isInstructor = !!instructorProfile;
      const isOrganizer = !!publishPermission.canPublishWithoutApproval;
      if (isInstructor && isOrganizer) {
        setRoleLabel('Eğitmen ve Organizatör');
      } else if (isInstructor) {
        setRoleLabel('Eğitmen');
      } else if (isOrganizer) {
        setRoleLabel('Organizatör');
      } else {
        setRoleLabel('');
      }
    } catch {
      setRoleLabel('');
    }
  }, []);

  const loadFollowLists = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setFollowingList([]);
      setFollowersList([]);
      return;
    }
    setFollowListsLoading(true);
    try {
      const [following, followers] = await Promise.all([
        followService.listMyFollowing(),
        followService.listMyFollowers(),
      ]);
      setFollowingList(following);
      setFollowersList(followers);
    } catch {
      setFollowingList([]);
      setFollowersList([]);
    } finally {
      setFollowListsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const counts = await followService.getMyFollowCounts();
        if (!cancelled) setFollowCounts({ following: counts.following, followers: counts.followers });
      } catch {
        // keep defaults; profile screen can still render without counts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDancedWith();
      void loadRoleLabel();
    }, [loadDancedWith, loadRoleLabel]),
  );

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        followService.getMyFollowCounts().then((counts) => setFollowCounts({ following: counts.following, followers: counts.followers })),
        loadDancedWith(),
        loadFollowLists(),
        loadRoleLabel(),
      ]);
    } catch {
      // ignore: UI already shows cached profile; refresh is best-effort
    } finally {
      setRefreshing(false);
    }
  };

  const handleUnfollowPress = (userId: string, userName: string) => {
    setConfirmModal({ userId, userName });
  };

  const handleConfirmUnfollow = () => {
    if (!confirmModal) return;
    const { userId } = confirmModal;
    setConfirmModal(null);
    void (async () => {
      try {
        await followService.unfollowUser(userId);
        setUnfollowedIds((prev) => new Set(prev).add(userId));
        setFollowCounts((c) => ({ ...c, following: Math.max(0, c.following - 1) }));
      } catch {
        // Sunucu hatası: sayaç ve liste bir sonraki yenilemede düzelir
      }
    })();
  };

  const handleFollowUser = (user: FollowListUser) => {
    void (async () => {
      try {
        await followService.followUser(user.id);
        setUnfollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        setFollowingList((prev) => (prev.some((u) => u.id === user.id) ? prev : [user, ...prev]));
        setFollowCounts((c) => ({ ...c, following: c.following + 1 }));
      } catch {
        // İstek başarısız
      }
    })();
  };

  const handleFollowDancedUser = (user: DancedWithPerson) => {
    if (followActionBusyIds.has(user.id)) return;
    setFollowActionBusyIds((prev) => new Set(prev).add(user.id));
    void (async () => {
      try {
        await followService.followUser(user.id);
        setUnfollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        setFollowingList((prev) => (
          prev.some((u) => u.id === user.id)
            ? prev
            : [
                {
                  id: user.id,
                  name: user.name,
                  handle: user.username ? `@${user.username}` : '',
                  img: user.avatar,
                },
                ...prev,
              ]
        ));
        setFollowCounts((c) => ({ ...c, following: c.following + 1 }));
      } catch {
        // İstek başarısız
      } finally {
        setFollowActionBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
      }
    })();
  };

  const openDancedModal = () => {
    void loadDancedWith();
    void loadFollowLists();
    setDancedModalVisible(true);
  };

  const openFollowListModal = (tab: 'following' | 'followers') => {
    setActiveTab(tab);
    setFollowListModalVisible(true);
    void loadFollowLists();
  };

  const followListModalTitle = activeTab === 'following' ? 'Takip edilenler' : 'Takipçiler';

  const nameParts = profile.displayName.trim().split(/\s+/);
  const profileAd = nameParts[0] ?? '';
  const profileSoyad = nameParts.slice(1).join(' ');

  const goToDancedUserProfile = (u: DancedWithPerson) => {
    setDancedModalVisible(false);
    (navigation.getParent() as any)?.navigate('UserProfile', {
      userId: u.id,
      name: u.name,
      username: u.username || undefined,
      avatar: u.avatar,
    });
  };

  return (
    <Screen>
      <ConfirmModal
        visible={!!confirmModal}
        title="Emin misiniz?"
        message={
          confirmModal
            ? `${confirmModal.userName} kullanıcısını takipten çıkarmak istediğinize emin misiniz?`
            : ''
        }
        cancelLabel="İptal"
        confirmLabel="Eminim"
        onCancel={() => setConfirmModal(null)}
        onConfirm={handleConfirmUnfollow}
      />

      <Modal visible={dancedModalVisible} transparent animationType="slide" onRequestClose={() => setDancedModalVisible(false)}>
        <View style={styles.dancedModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setDancedModalVisible(false)} />
          <View
            style={[
              styles.dancedModalSheet,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '88%',
              },
            ]}
          >
            <View style={styles.dancedModalHandle} />
            <View style={[styles.dancedModalHeader, { paddingHorizontal: spacing.lg }]}>
              <Text style={[typography.h4, { color: '#FFFFFF' }]}>Dans edilenler</Text>
              <TouchableOpacity
                onPress={() => setDancedModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.dancedModalClose, { borderRadius: radius.full, borderColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {dancedWithList.length > 0 ? (
                dancedWithList.map((u) => {
                  const isEffectivelyFollowing = followingIdSet.has(u.id) && !unfollowedIds.has(u.id);
                  const isBusy = followActionBusyIds.has(u.id);
                  return (
                    <UserListItem
                      key={u.id}
                      name={u.name}
                      subtitle={u.username ? `@${u.username}` : undefined}
                      avatar={u.avatar}
                      onPress={() => goToDancedUserProfile(u)}
                      rightLabel={isBusy ? '...' : isEffectivelyFollowing ? 'Takipten Çık' : 'Takip Et'}
                      rightVariant="outline"
                      onRightPress={
                        isBusy
                          ? undefined
                          : isEffectivelyFollowing
                            ? () => handleUnfollowPress(u.id, u.name)
                            : () => handleFollowDancedUser(u)
                      }
                      nameColor="#FFFFFF"
                      subtitleColor="#9CA3AF"
                      rightButtonBorderColor="#9CA3AF"
                      rightButtonTextColor="#9CA3AF"
                    />
                  );
                })
              ) : (
                <Text style={[typography.bodySmall, { color: '#9CA3AF', paddingVertical: spacing.xl, textAlign: 'center' }]}>
                  {hasSupabaseConfig()
                    ? "Dance Circle'da sağa kaydırdığın kişiler burada listelenir."
                    : 'Dans ettiklerinizi görmek için uygulama yapılandırması gerekir.'}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={followListModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowListModalVisible(false)}
      >
        <View style={styles.dancedModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFollowListModalVisible(false)} />
          <View
            style={[
              styles.dancedModalSheet,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '88%',
              },
            ]}
          >
            <View style={styles.dancedModalHandle} />
            <View style={[styles.dancedModalHeader, { paddingHorizontal: spacing.lg }]}>
              <Text style={[typography.h4, { color: '#FFFFFF' }]}>{followListModalTitle}</Text>
              <TouchableOpacity
                onPress={() => setFollowListModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.dancedModalClose, { borderRadius: radius.full, borderColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <TabSwitch
                tabs={[
                  { key: 'following', label: 'Takip Edilen' },
                  { key: 'followers', label: 'Takipçiler' },
                ]}
                activeTab={activeTab}
                onTabChange={(k) => setActiveTab(k as 'following' | 'followers')}
                containerRadius={50}
                containerBgColor="#311831"
                indicatorColor="#020617"
                textColor="#9CA3AF"
                activeTextColor="#FFFFFF"
              />
            </View>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <SearchBar
                value={followListSearchQuery}
                onChangeText={setFollowListSearchQuery}
                placeholder="İsim veya kullanıcı adı ara..."
                backgroundColor="#311831"
              />
            </View>
            <ScrollView
              style={{ flexGrow: 1, maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {followListsLoading ? (
                <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : rawFollowListForModal.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>Henüz kimse yok.</Text>
                </View>
              ) : filteredFollowList.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={[typography.bodySmall, { color: '#9CA3AF', textAlign: 'center' }]}>
                    Aramanızla eşleşen kullanıcı yok.
                  </Text>
                </View>
              ) : (
                filteredFollowList.map((user: FollowListUser) => {
                  const isEffectivelyFollowing = followingIdSet.has(user.id) && !unfollowedIds.has(user.id);
                  const rightLabel = isEffectivelyFollowing ? 'Takipten Çık' : 'Takip Et';
                  const onRightPress = isEffectivelyFollowing
                    ? () => handleUnfollowPress(user.id, user.name)
                    : () => handleFollowUser(user);
                  const usernameParam = user.handle.startsWith('@') ? user.handle.slice(1) : user.handle;
                  return (
                    <UserListItem
                      key={user.id}
                      name={user.name}
                      subtitle={user.handle || undefined}
                      avatar={user.img}
                      onPress={() => {
                        setFollowListModalVisible(false);
                        (navigation.getParent() as any)?.navigate('UserProfile', {
                          userId: user.id,
                          name: user.name,
                          username: usernameParam || undefined,
                          avatar: user.img,
                        });
                      }}
                      rightLabel={rightLabel}
                      rightVariant="outline"
                      onRightPress={onRightPress}
                      nameColor="#FFFFFF"
                      subtitleColor="#9CA3AF"
                      rightButtonBorderColor="#9CA3AF"
                      rightButtonTextColor="#9CA3AF"
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Profil',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
          rightIcon: 'cog',
          onRightPress: () => (navigation.getParent() as any)?.navigate('Settings'),
        }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}
        // Enable pull-to-refresh visibility (Android needs overscroll).
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        // iOS: allow pull even when content is short.
        alwaysBounceVertical
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
            // Keep spinner below the absolute header.
            progressViewOffset={insets.top + 60 + 12}
          />
        }
      >
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <Avatar
            source={avatarSource}
            size="xl"
            showBorder
          />
        </View>
        {profile.displayName ? (
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>{profile.displayName}</Text>
        ) : null}
        {profile.username ? (
          <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>@{profile.username}</Text>
        ) : null}
        {roleLabel ? (
          <View
            style={{
              marginTop: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 8,
              borderRadius: radius.full,
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{roleLabel}</Text>
          </View>
        ) : null}
        {shouldShowAvatarWarning ? (
          <Text style={[typography.caption, { color: '#F59E0B', textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }]}>
            Uyarı: Profil fotoğrafınızın güncellenmesi için fotoğrafınızı tekrar seçip Kaydet yapın.
          </Text>
        ) : null}

        <View style={[styles.statsRow, { backgroundColor: '#311831', borderRadius: 50, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 0.5, borderColor: '#9CA3AF' }]}>
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowListModal('following')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{followCounts.following}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Takip Edilen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowListModal('followers')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{followCounts.followers}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={openDancedModal} activeOpacity={0.75}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{dancedWithList.length}</Text>
            <Text style={[typography.label, { color: '#FFFFFF' }]}>Dans Edilen</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: '100%', paddingHorizontal: spacing.lg, marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: '#311831',
                borderColor: colors.cardBorder,
                borderRadius: radius.xl,
                padding: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.md }]}>Profil bilgileri</Text>

            <ProfileInfoRow label="Ad" value={profileAd} />
            <ProfileInfoRow label="Soyad" value={profileSoyad} />
            <ProfileInfoRow label="Kullanıcı adı" value={profile.username ? `@${profile.username}` : ''} />
            <ProfileInfoRow label="E-posta" value={profile.email} />
            <ProfileInfoRow label="Şehir" value={profile.city} />
            <ProfileInfoRow label="Hakkımda" value={profile.bio} multiline />
            {profile.otherInterests.trim() ? (
              <ProfileInfoRow label="Diğer ilgi alanları" value={profile.otherInterests} multiline />
            ) : null}

            <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: spacing.sm, marginTop: spacing.xs }]}>
              Favori danslar
            </Text>
            {profile.favoriteDances?.length ? (
              <View style={styles.tagsRow}>
                {favoriteDancesLabels.map((label, i) => (
                  <View
                    key={(profile.favoriteDances ?? [])[i] ?? `dance-${i}`}
                    style={[styles.tag, { borderColor: 'rgba(255,255,255,0.12)' }]}
                  >
                    <Icon name="music" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[typography.caption, { color: '#9CA3AF' }]}>Henüz seçmedin.</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => (navigation.getParent() as any)?.navigate('EditProfile')}
          activeOpacity={0.8}
          style={[styles.editProfileBtn, { backgroundColor: '#4B154B', borderRadius: 50, marginTop: spacing.lg }]}
        >
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Profili düzenle</Text>
        </TouchableOpacity>

      </CollapsingHeaderScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  infoCard: {
    borderWidth: 1,
    width: '100%',
  },
  editProfileBtn: {
    width: '80%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '90%' },
  statItem: { flex: 1, alignItems: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    backgroundColor: '#311831',
    borderRadius: 9999,
  },
  dancedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dancedModalSheet: {
    paddingTop: 10,
  },
  dancedModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dancedModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dancedModalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

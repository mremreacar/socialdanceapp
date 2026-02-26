import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { Avatar } from '../../components/ui/Avatar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { UserListItem } from '../../components/domain/UserListItem';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { mockFollowing } from '../../constants/mockData';

const followersList = [
  { id: 5, name: 'Zeynep Su', handle: '@zeynepsu', img: 'https://i.pravatar.cc/150?u=25' },
  { id: 6, name: 'Burak Öz', handle: '@burakoz', img: 'https://i.pravatar.cc/150?u=26' },
];
const requestsList = [{ id: 7, name: 'Gizem Ak', handle: '@gizemak', img: 'https://i.pravatar.cc/150?u=27' }];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography } = useTheme();
  const { profile, avatarSource } = useProfile();
  const [activeTab, setActiveTab] = useState<'following' | 'followers' | 'requests'>('following');
  const [dancedCount] = useState(42);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<number>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ userId: number; userName: string } | null>(null);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const handleUnfollowPress = (userId: number, userName: string) => {
    setConfirmModal({ userId, userName });
  };

  const handleConfirmUnfollow = () => {
    if (confirmModal) {
      setUnfollowedIds((prev) => new Set(prev).add(confirmModal.userId));
      setConfirmModal(null);
    }
  };

  const handleFollowPress = (userId: number) => {
    setUnfollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const getList = () => {
    if (activeTab === 'following') return mockFollowing;
    if (activeTab === 'followers') return followersList;
    return requestsList;
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
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Profil',
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          rightIcon: 'cog',
          onRightPress: () => (navigation.getParent() as any)?.navigate('Settings'),
        }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}
      >
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <Avatar
            source={avatarSource}
            size="xl"
            showBorder
          />
        </View>
        <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>{profile.displayName}</Text>
        <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>@{profile.username}</Text>
        <Text style={[typography.bodySmall, { color: '#919FB4', textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xxl }]}>
          {profile.bio}
        </Text>

        <TouchableOpacity
          onPress={() => (navigation.getParent() as any)?.navigate('EditProfile')}
          activeOpacity={0.8}
          style={[styles.editProfileBtn, { backgroundColor: '#4B154B', borderRadius: 50, marginTop: spacing.xl }]}
        >
          <Text style={[typography.bodySmallBold, { color: '#F22DF3' }]}>Profili düzenle</Text>
        </TouchableOpacity>

        <View style={[styles.statsRow, { backgroundColor: '#2C1C2D', borderRadius: 50, padding: spacing.lg, marginTop: spacing.md }]}>
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('following')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{mockFollowing.length - unfollowedIds.size}</Text>
            <Text style={[typography.label, { color: '#919FB4' }]}>Takip Edilen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('followers')}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{followersList.length}</Text>
            <Text style={[typography.label, { color: '#919FB4' }]}>Takipçi</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{dancedCount}</Text>
            <Text style={[typography.label, { color: '#919FB4' }]}>Dans Edilen</Text>
          </View>
        </View>

        <View style={{ width: '100%', paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <TabSwitch
            tabs={[
              { key: 'following', label: 'Takip Edilen' },
              { key: 'followers', label: 'Takipçiler' },
              { key: 'requests', label: 'İstekler', badge: requestsList.length },
            ]}
            activeTab={activeTab}
            onTabChange={(k) => setActiveTab(k as any)}
            containerRadius={50}
            containerBgColor="#1E283A"
            indicatorColor="#020617"
            textColor="#FFFFFF"
            activeTextColor="#EE2AEE"
          />
          <View style={{ marginTop: spacing.lg }}>
            {getList().length > 0 ? (
              getList().map((user: any) => {
                const isUnfollowed = activeTab === 'following' && unfollowedIds.has(user.id);
                const rightLabel =
                  activeTab === 'requests' ? 'Onayla' : isUnfollowed ? 'Takip Et' : 'Takipten Çık';
                const onRightPress =
                  activeTab === 'requests'
                    ? () => {}
                    : isUnfollowed
                      ? () => handleFollowPress(user.id)
                      : () => handleUnfollowPress(user.id, user.name);
                return (
                  <UserListItem
                    key={user.id}
                    name={user.name}
                    subtitle={user.handle}
                    avatar={user.img}
                    rightLabel={rightLabel}
                    rightVariant={activeTab === 'requests' ? 'primary' : 'outline'}
                    onRightPress={onRightPress}
                    nameColor="#FFFFFF"
                    subtitleColor="#919FB4"
                    rightButtonBorderColor="#354359"
                    rightButtonTextColor="#C4CDDA"
                  />
                );
              })
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>Henüz kimse yok.</Text>
              </View>
            )}
          </View>
        </View>
      </CollapsingHeaderScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  editProfileBtn: {
    width: '80%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '90%' },
  statItem: { flex: 1, alignItems: 'center' },
});

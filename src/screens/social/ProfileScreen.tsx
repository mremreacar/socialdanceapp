import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/ui/Avatar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { UserListItem } from '../../components/domain/UserListItem';
import { mockFollowing } from '../../constants/mockData';

const followersList = [
  { id: 5, name: 'Zeynep Su', handle: '@zeynepsu', img: 'https://i.pravatar.cc/150?u=25' },
  { id: 6, name: 'Burak Öz', handle: '@burakoz', img: 'https://i.pravatar.cc/150?u=26' },
];
const requestsList = [{ id: 7, name: 'Gizem Ak', handle: '@gizemak', img: 'https://i.pravatar.cc/150?u=27' }];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<'following' | 'followers' | 'requests'>('following');
  const [dancedCount] = useState(42);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const getList = () => {
    if (activeTab === 'following') return mockFollowing;
    if (activeTab === 'followers') return followersList;
    return requestsList;
  };

  return (
    <Screen>
      <Header title="Profil" showBack={false} showMenu onMenuPress={openDrawer} rightIcon="cog" onRightPress={() => (navigation.getParent() as any)?.navigate('Settings')} />

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <Avatar
            source="https://lh3.googleusercontent.com/aida-public/AB6AXuAozkav3nW4pjxxBTZ9r4bnylgPIqCTaCZfeooT-iWfynJKZXgRv-HsTDa3vAtFwVs-S0q_5DxzyefpzHzF9dxop2EIWngyydzbp00sS9RD_GW7EAYzlT5uL0xw7zjOZu4BhH4QjAGHvnjHbl6blJTPQPYsnNb08fT2JwDrOlRZhBHfCqRwlN3GOJq-wj48GfdD3ZyLxdmrkroY0i1ic51l_ssDbmO_cM2bldocE_cHmHuSYfM4JE3Up_oWcyj3HNikmvQ4rUzFrWE"
            size="xl"
            showBorder
          />
        </View>
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Elif Yılmaz</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>@elifyilmaz</Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xxl }]}>
          Salsa ve Bachata tutkunu. Yeni insanlarla tanışıp dans etmeyi seviyorum!
        </Text>

        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('following')}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{mockFollowing.length}</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Takip Edilen</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('followers')}>
            <Text style={[typography.bodyBold, { color: colors.text }]}>{followersList.length}</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Takipçi</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[typography.bodyBold, { color: colors.primary }]}>{dancedCount}</Text>
            <Text style={[typography.label, { color: colors.textSecondary }]}>Dans Edilen</Text>
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
          />
          <View style={{ marginTop: spacing.lg }}>
            {getList().length > 0 ? (
              getList().map((user: any) => (
                <UserListItem
                  key={user.id}
                  name={user.name}
                  subtitle={user.handle}
                  avatar={user.img}
                  rightLabel={activeTab === 'requests' ? 'Onayla' : 'Takipten Çık'}
                  rightVariant={activeTab === 'requests' ? 'primary' : 'outline'}
                  onRightPress={() => {}}
                />
              ))
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>Henüz kimse yok.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarRing: { padding: 4, borderRadius: 9999, borderWidth: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '90%' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch' },
});

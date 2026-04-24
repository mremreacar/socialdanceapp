import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { creatorSchoolEventsService, type ManagedSchoolEventItem, type PublishStatus } from '../../services/api/schoolEvents';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

function formatEventDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Tarih bilgisi okunamadı';
  return date.toLocaleString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventTypeLabel(value: string | null | undefined): string {
  return value === 'lesson' ? 'Ders' : 'Etkinlik';
}

function getPublishStatusMeta(status: PublishStatus | null | undefined): { label: string; bg: string; fg: string } {
  if (status === 'approved') return { label: 'Yayında', bg: 'rgba(34,197,94,0.14)', fg: '#86EFAC' };
  if (status === 'rejected') return { label: 'Reddedildi', bg: 'rgba(239,68,68,0.14)', fg: '#FCA5A5' };
  return { label: 'Onay Bekliyor', bg: 'rgba(245,158,11,0.16)', fg: '#FCD34D' };
}

export const UserPanelScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius, typography } = useTheme();
  const [items, setItems] = useState<ManagedSchoolEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ManagedSchoolEventItem | null>(null);
  const load = useCallback(async () => {
    try {
      const rows = await creatorSchoolEventsService.listMine();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const handleDelete = useCallback((item: ManagedSchoolEventItem) => {
    setPendingDeleteItem(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDeleteItem) return;

    setDeletingId(pendingDeleteItem.id);
    void creatorSchoolEventsService
      .deleteMine(pendingDeleteItem.id)
      .then(() => {
        setItems((current) => current.filter((currentItem) => currentItem.id !== pendingDeleteItem.id));
        setPendingDeleteItem(null);
      })
      .catch((error) => {
        Alert.alert(
          'Etkinlik silinemedi',
          error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
        );
      })
      .finally(() => setDeletingId((current) => (current === pendingDeleteItem.id ? null : current)));
  }, [pendingDeleteItem]);

  return (
    <Screen>
      <ConfirmModal
        visible={pendingDeleteItem != null}
        icon="delete-outline"
        title="Etkinlik silinsin mi?"
        message={`"${pendingDeleteItem?.title?.trim() || 'Bu etkinlik'}" kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.`}
        cancelLabel="Vazgeç"
        confirmLabel="Kalıcı Olarak Sil"
        confirmVariant="danger"
        loading={pendingDeleteItem != null && deletingId === pendingDeleteItem.id}
        onCancel={() => {
          if (!deletingId) setPendingDeleteItem(null);
        }}
        onConfirm={confirmDelete}
      />
      <Header
        title="Etkinlik Paneli"
        showBack
        rightIcon="plus"
        onRightPress={() => navigation.navigate('EditEvent')}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : items.length === 0 ? (
          <View
            style={{
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.lg,
            }}
          >
            <EmptyState
              icon="calendar-blank-outline"
              title="Henüz oluşturduğun etkinlik yok"
              subtitle="İlk etkinliğini oluşturduğunda burada listelenecek."
            />
          </View>
        ) : (
          <>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>
              {items.length} etkinlik bulundu
            </Text>
            {items.map((item) => {
              const locationLine = item.location?.trim() || item.city?.trim() || item.school_name;
              const statusMeta = getPublishStatusMeta(item.publish_status);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('EventDetails', { id: item.id, includeUnpublished: true })}
                  style={[
                    styles.eventCard,
                    {
                      backgroundColor: '#311831',
                      borderRadius: radius.xl,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      padding: spacing.lg,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: spacing.md }}>
                      <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]} numberOfLines={2}>
                        {item.title?.trim() || 'Etkinlik'}
                      </Text>
                      <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={1}>
                        {item.school_name}
                      </Text>
                    </View>
                    <View style={[styles.badge, { borderRadius: radius.full, backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[typography.captionBold, { color: colors.primary }]}>
                        {getEventTypeLabel(item.event_type)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      marginTop: spacing.sm,
                      alignSelf: 'flex-start',
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      borderRadius: radius.full,
                      backgroundColor: statusMeta.bg,
                    }}
                  >
                    <Text style={[typography.captionBold, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
                  </View>

                  <View style={{ marginTop: spacing.md }}>
                    <View style={styles.metaRow}>
                      <Icon name="calendar-outline" size={16} color="#9CA3AF" />
                      <Text style={[typography.caption, { color: '#9CA3AF', marginLeft: spacing.sm, flex: 1 }]}>
                        {formatEventDateLabel(item.starts_at)}
                      </Text>
                    </View>
                    <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
                      <Icon name="map-marker-outline" size={16} color="#9CA3AF" />
                      <Text style={[typography.caption, { color: '#9CA3AF', marginLeft: spacing.sm, flex: 1 }]} numberOfLines={2}>
                        {locationLine || 'Konum bilgisi yakında güncellenecek'}
                      </Text>
                    </View>
                    {item.publish_status === 'rejected' && item.rejection_reason?.trim() ? (
                      <Text style={[typography.caption, { color: '#FCA5A5', marginTop: spacing.sm }]}>
                        Red nedeni: {item.rejection_reason.trim()}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.actionsRow, { marginTop: spacing.lg }]}>
                    <Button
                      title="Detay"
                      variant="outline"
                      size="sm"
                      onPress={() => navigation.navigate('EventDetails', { id: item.id, includeUnpublished: true })}
                      style={styles.detailActionButton}
                      textStyle={styles.detailButtonText}
                    />
                    <Button
                      title="Düzenle"
                      size="sm"
                      icon="pencil-outline"
                      onPress={() => navigation.navigate('EditEvent', { eventId: item.id })}
                      style={styles.actionButton}
                    />
                    <Button
                      title="Sil"
                      variant="danger"
                      size="sm"
                      icon="delete-outline"
                      loading={deletingId === item.id}
                      disabled={deletingId != null && deletingId !== item.id}
                      onPress={() => handleDelete(item)}
                      style={styles.actionButton}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  eventCard: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  detailActionButton: {
    flex: 1,
    borderColor: '#9CA3AF',
  },
  detailButtonText: {
    color: '#FFFFFF',
  },
});

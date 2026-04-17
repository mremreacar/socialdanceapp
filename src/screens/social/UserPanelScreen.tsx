import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { LessonDateTimeField } from '../../components/instructor/LessonDateTimeField';
import { useTheme } from '../../theme';
import { createSchoolEvent, creatorSchoolEventsService, type ManagedSchoolEventItem, type PublishStatus } from '../../services/api/schoolEvents';
import { getSchoolById, listSchools, type SchoolRow } from '../../services/api/schools';
import { instructorSchoolAssignmentsService, type AssignedSchoolItem } from '../../services/api/instructorSchoolAssignments';
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

function parseParticipantLimit(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseTicketPrice(raw: string): number | null {
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export const UserPanelScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius, typography } = useTheme();
  const [items, setItems] = useState<ManagedSchoolEventItem[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [assignedSchools, setAssignedSchools] = useState<AssignedSchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [preselectedSchool, setPreselectedSchool] = useState<SchoolRow | null>(null);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ManagedSchoolEventItem | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventDateTime, setEventDateTime] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [participantLimit, setParticipantLimit] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [creating, setCreating] = useState(false);

  const visibleSelectedSchool = useMemo(() => {
    if (selectedSchoolId) {
      return schools.find((school) => school.id === selectedSchoolId) ?? preselectedSchool;
    }
    return null;
  }, [preselectedSchool, schools, selectedSchoolId]);
  const availableSchools = useMemo(() => {
    if (!preselectedSchool) return schools;
    if (schools.some((school) => school.id === preselectedSchool.id)) return schools;
    return [preselectedSchool, ...schools];
  }, [preselectedSchool, schools]);
  const filteredSchools = useMemo(() => {
    const query = schoolSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return availableSchools;
    return availableSchools.filter((school) => {
      const haystack = [school.name, school.city, school.district]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    });
  }, [availableSchools, schoolSearchQuery]);
  const showIndependentEventOption = useMemo(() => {
    const query = schoolSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return true;
    return 'bağımsız etkinlik'.includes(query) || 'okula bağlı olmayan etkinlik'.includes(query);
  }, [schoolSearchQuery]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSchoolsLoading(true);
      try {
        const rows = await listSchools({ limit: 200 });
        if (!cancelled) setSchools(rows);
      } catch {
        if (!cancelled) setSchools([]);
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await instructorSchoolAssignmentsService.listMine();
        if (!cancelled) setAssignedSchools(rows);
      } catch {
        if (!cancelled) setAssignedSchools([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setPreselectedSchool(null);
      return;
    }
    if (schools.some((school) => school.id === selectedSchoolId)) {
      setPreselectedSchool(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getSchoolById(selectedSchoolId);
        if (!cancelled) setPreselectedSchool(row ?? null);
      } catch {
        if (!cancelled) setPreselectedSchool(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schools, selectedSchoolId]);

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

  const resetCreateForm = useCallback(() => {
    setEventName('');
    setEventDateTime(null);
    setSelectedSchoolId(null);
    setEventLocation('');
    setEventCity('');
    setEventDescription('');
    setParticipantLimit('');
    setTicketPrice('');
  }, []);

  const openSchoolPicker = () => {
    setSchoolSearchQuery('');
    setShowSchoolPicker(true);
  };

  const handleCreate = useCallback(async () => {
    const parsedParticipantLimit = parseParticipantLimit(participantLimit);
    const parsedTicketPrice = parseTicketPrice(ticketPrice);

    if (!eventName.trim()) {
      Alert.alert('Eksik Bilgi', 'Etkinlik adı zorunludur.');
      return;
    }
    if (!eventDescription.trim()) {
      Alert.alert('Eksik Bilgi', 'Açıklama zorunludur.');
      return;
    }
    if (!eventDateTime) {
      Alert.alert('Eksik Bilgi', 'Tarih ve saat seçiniz.');
      return;
    }
    if (!eventLocation.trim()) {
      Alert.alert('Eksik Bilgi', 'Konum zorunludur.');
      return;
    }
    if (parsedParticipantLimit == null) {
      Alert.alert('Eksik Bilgi', 'Geçerli bir katılımcı limiti giriniz.');
      return;
    }
    if (!ticketPrice.trim() || parsedTicketPrice == null) {
      Alert.alert('Eksik Bilgi', 'Geçerli bir bilet fiyatı giriniz.');
      return;
    }

    setCreating(true);
    try {
      await createSchoolEvent({
        schoolId: selectedSchoolId,
        title: eventName.trim(),
        startsAt: eventDateTime.toISOString(),
        city: eventCity.trim() || null,
        location: eventLocation.trim(),
        description: eventDescription.trim(),
        participantLimit: parsedParticipantLimit,
        priceAmount: parsedTicketPrice,
        priceCurrency: 'TRY',
        eventType: 'event',
        publishStatus: 'pending',
        locationPlace: {
          address: eventLocation.trim(),
          formatted_address: eventLocation.trim(),
          city: eventCity.trim() || null,
        },
      });
      resetCreateForm();
      await load();
    } catch (error) {
      Alert.alert('Etkinlik oluşturulamadı', error instanceof Error ? error.message : 'Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  }, [eventCity, eventDateTime, eventDescription, eventLocation, eventName, participantLimit, resetCreateForm, selectedSchoolId, ticketPrice, load]);

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
      <Header title="Etkinlik Paneli" showBack />
      <Modal
        visible={showSchoolPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSchoolPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowSchoolPicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => null}
            style={{
              backgroundColor: '#2C1C2D',
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              maxHeight: '82%',
              paddingTop: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.xl,
            }}
          >
            <View style={{ alignSelf: 'center', width: 44, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Okul seç</Text>
                <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Etkinliğin bağlı olacağı okulu seçebilirsin.</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowSchoolPicker(false)}
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>×</Text>
              </TouchableOpacity>
            </View>
            <Input label="Okul ara" value={schoolSearchQuery} onChangeText={setSchoolSearchQuery} placeholder="Okul adı, şehir veya ilçe" />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: spacing.md }}>
              {schoolsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : (
                <>
                  {showIndependentEventOption ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setSelectedSchoolId(null);
                        setShowSchoolPicker(false);
                      }}
                      style={{ marginBottom: spacing.sm, padding: spacing.md, backgroundColor: '#241626', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.cardBorder }}
                    >
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Bağımsız etkinlik</Text>
                      <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Bir okula bağlı olmadan oluştur.</Text>
                    </TouchableOpacity>
                  ) : null}
                  {assignedSchools.length > 0 ? (
                    <View style={{ marginBottom: spacing.md }}>
                      <Text style={[typography.captionBold, { color: colors.primary, marginBottom: spacing.xs }]}>Hızlı seçim</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {assignedSchools.map((school) => {
                          const selected = selectedSchoolId === school.schoolId;
                          return (
                            <TouchableOpacity
                              key={school.schoolId}
                              activeOpacity={0.8}
                              onPress={() => setSelectedSchoolId(school.schoolId)}
                              style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: selected ? colors.primary : 'rgba(255,255,255,0.12)', backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                            >
                              <Text style={[typography.captionBold, { color: '#FFFFFF' }]} numberOfLines={1}>{school.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                  {filteredSchools.map((school) => {
                    const selected = selectedSchoolId === school.id;
                    return (
                      <TouchableOpacity
                        key={school.id}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedSchoolId(school.id);
                          setShowSchoolPicker(false);
                          setEventCity(school.city ?? '');
                        }}
                        style={{ marginBottom: spacing.sm, padding: spacing.md, backgroundColor: '#241626', borderRadius: radius.xl, borderWidth: 1, borderColor: selected ? colors.primary : colors.cardBorder }}
                      >
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={1}>{school.name}</Text>
                        <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={1}>
                          {[school.city, school.district].filter(Boolean).join(' · ') || 'Şehir bilgisi yok'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}22` }]}>
              <Icon name="calendar-edit" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Oluşturduğun etkinlikler</Text>
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>
                Etkinliği burada oluştur, sonra listenden yönet.
              </Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <View>
              <View style={styles.heroRow}>
                <View
                  style={[
                    styles.heroIcon,
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      marginRight: spacing.sm,
                      backgroundColor: '#4B154B',
                      borderColor: 'rgba(255,255,255,0.2)',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Icon name="school" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.label, { color: '#9CA3AF' }]}>Bağlı Okul</Text>
              </View>
              <View style={{ height: spacing.xs }} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => !schoolsLoading && openSchoolPicker()}
                disabled={schoolsLoading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 52,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  backgroundColor: 'transparent',
                }}
              >
                {schoolsLoading ? (
                  <>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={[typography.body, { color: '#9CA3AF', marginLeft: spacing.sm, flex: 1 }]}>Okullar yükleniyor...</Text>
                  </>
                ) : (
                  <>
                    <Text style={[typography.body, { color: visibleSelectedSchool ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                      {visibleSelectedSchool?.name || 'İstersen okul seç'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
                  </>
                )}
              </TouchableOpacity>
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.xs }]}>
                Bağımsız etkinlik de oluşturabilirsin.
              </Text>
            </View>
            <Input label="Etkinlik adı" value={eventName} onChangeText={setEventName} required />
            <LessonDateTimeField
              label="Tarih ve saat"
              helperText="Etkinliğin ne zaman başlayacağını seç."
              emptyText="Tarih seçmek için dokun"
              value={eventDateTime}
              onChange={setEventDateTime}
            />
            <Input label="Konum" value={eventLocation} onChangeText={setEventLocation} placeholder="Örn. Kadıköy Dans Stüdyosu" />
            <Input label="Şehir" value={eventCity} onChangeText={setEventCity} placeholder="İsteğe bağlı" />
            <Input
              label="Açıklama"
              value={eventDescription}
              onChangeText={setEventDescription}
              placeholder="İsteğe bağlı"
              multiline
            />
            <Input
              label="Katılımcı sayısı"
              value={participantLimit}
              onChangeText={setParticipantLimit}
              placeholder="Boş bırakılamaz"
              keyboardType="number-pad"
              required
            />
            <Input
              label="Bilet fiyatı (TL)"
              value={ticketPrice}
              onChangeText={setTicketPrice}
              placeholder="Boş = ücretsiz"
              keyboardType="decimal-pad"
            />
            <Button title="Etkinliği oluştur" onPress={() => void handleCreate()} loading={creating} fullWidth />
          </View>
        </View>

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
  heroCard: {},
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { MainStackParamList } from '../../types/navigation';
import { useTheme } from '../../theme';
import { schoolAdminService, type ManagedSchoolModel } from '../../services/api/schoolAdmin';
import {
  instructorSchoolEventsService,
  schoolEventModerationService,
  type ManagedSchoolEventItem,
  type PublishStatus,
  type SchoolEventCreatorSummary,
} from '../../services/api/schoolEvents';

type Props = NativeStackScreenProps<MainStackParamList, 'SchoolAdminPanel'>;
type SchoolAdminTabId = 'overview' | 'location' | 'contact' | 'lessons' | 'events';

const SCHOOL_ADMIN_TABS: { id: SchoolAdminTabId; label: string }[] = [
  { id: 'overview', label: 'Genel' },
  { id: 'location', label: 'Konum' },
  { id: 'contact', label: 'İletişim' },
  { id: 'lessons', label: 'Dersler' },
  { id: 'events', label: 'Etkinlikler' },
];

function parseOptionalFloat(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function getPublishStatusMeta(status: PublishStatus | null | undefined): { label: string; bg: string; fg: string } {
  if (status === 'approved') return { label: 'Yayında', bg: 'rgba(34,197,94,0.14)', fg: '#86EFAC' };
  if (status === 'rejected') return { label: 'Reddedildi', bg: 'rgba(239,68,68,0.14)', fg: '#FCA5A5' };
  return { label: 'Onay Bekliyor', bg: 'rgba(245,158,11,0.16)', fg: '#FCD34D' };
}

export const SchoolAdminPanelScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<SchoolAdminTabId>('overview');
  const [school, setSchool] = useState<ManagedSchoolModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [schoolEvents, setSchoolEvents] = useState<ManagedSchoolEventItem[]>([]);
  const [schoolLessons, setSchoolLessons] = useState<ManagedSchoolEventItem[]>([]);
  const [eventCreators, setEventCreators] = useState<SchoolEventCreatorSummary[]>([]);
  const [eventActionLoadingId, setEventActionLoadingId] = useState<string | null>(null);
  const [permissionLoadingUserId, setPermissionLoadingUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [snippet, setSnippet] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [website, setWebsite] = useState('');
  const [telephone, setTelephone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applySchool = useCallback((row: ManagedSchoolModel) => {
    setSchool(row);
    setName(row.name);
    setCategory(row.category ?? '');
    setSnippet(row.snippet ?? '');
    setAddress(row.address ?? '');
    setCity(row.city ?? '');
    setDistrict(row.district ?? '');
    setLatitude(row.latitude != null ? String(row.latitude) : '');
    setLongitude(row.longitude != null ? String(row.longitude) : '');
    setWebsite(row.website ?? '');
    setTelephone(row.telephone ?? '');
    setImageUrl(row.imageUrl ?? '');
    setSelectedImageUri(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [row, eventRows, creatorRows] = await Promise.all([
        schoolAdminService.getManagedSchool(route.params.schoolId),
        instructorSchoolEventsService.listMine().catch(() => []),
        schoolEventModerationService.listCreatorsForSchool(route.params.schoolId).catch(() => []),
      ]);
      if (!row) {
        setSchool(null);
        setEventCreators([]);
        setSchoolEvents([]);
        setSchoolLessons([]);
        setErrorBanner('Okul bulunamadı.');
      } else {
        applySchool(row);
      }
      setSchoolEvents(
        (eventRows ?? []).filter((item) => item.school_id === route.params.schoolId && item.event_type !== 'lesson'),
      );
      setSchoolLessons((eventRows ?? []).filter((item) => item.school_id === route.params.schoolId && item.event_type === 'lesson'));
      setEventCreators(creatorRows);
    } catch (error: unknown) {
      setSchool(null);
      setEventCreators([]);
      setSchoolEvents([]);
      setSchoolLessons([]);
      setErrorBanner(error instanceof Error ? error.message : 'Okul paneli yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [applySchool, route.params.schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const ownerNote = useMemo(
    () => 'Bu panel atandığın okulun bilgilerini güncellemen, düzenlemen ve silmen için açılır.',
    [],
  );
  const moderationQueue = useMemo(
    () =>
      schoolEvents
        .filter((item) => item.publish_status !== 'approved')
        .sort((a, b) => {
          if (a.publish_status === b.publish_status) return b.starts_at.localeCompare(a.starts_at);
          if (a.publish_status === 'pending') return -1;
          if (b.publish_status === 'pending') return 1;
          return b.starts_at.localeCompare(a.starts_at);
        }),
    [schoolEvents],
  );

  const displayImageUri = selectedImageUri?.trim() || imageUrl.trim();

  const formatEventDateLabel = useCallback((startsAt: string) => {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) return 'Tarih bilgisi okunamadı';
    return date.toLocaleString('tr-TR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const pickSchoolImage = async () => {
    let ImagePicker: typeof import('expo-image-picker') | null = null;
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      setErrorBanner('Fotoğraf seçici açılamadı.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorBanner('Kapak görseli için galeri izni gerekli.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
        setErrorBanner(null);
      }
    } catch {
      setErrorBanner('Kapak görseli seçilemedi.');
    }
  };

  const handleApproveEvent = useCallback(async (eventId: string) => {
    setEventActionLoadingId(eventId);
    setErrorBanner(null);
    try {
      await schoolEventModerationService.approveEvent(route.params.schoolId, eventId);
      setSuccessModal('Etkinlik onaylandı ve yayına alındı.');
      await load();
    } catch (error) {
      setErrorBanner(error instanceof Error ? error.message : 'Etkinlik onaylanamadı.');
    } finally {
      setEventActionLoadingId((current) => (current === eventId ? null : current));
    }
  }, [load, route.params.schoolId]);

  const handleRejectEvent = useCallback(async (eventId: string) => {
    setEventActionLoadingId(eventId);
    setErrorBanner(null);
    try {
      await schoolEventModerationService.rejectEvent(route.params.schoolId, eventId, 'Etkinlik admin incelemesinde reddedildi.');
      setSuccessModal('Etkinlik reddedildi. Kullanıcı panelinde red bilgisi görünecek.');
      await load();
    } catch (error) {
      setErrorBanner(error instanceof Error ? error.message : 'Etkinlik reddedilemedi.');
    } finally {
      setEventActionLoadingId((current) => (current === eventId ? null : current));
    }
  }, [load, route.params.schoolId]);

  const handleToggleCreatorPermission = useCallback(async (creator: SchoolEventCreatorSummary) => {
    setPermissionLoadingUserId(creator.userId);
    setErrorBanner(null);
    try {
      await schoolEventModerationService.setCreatorPublishPermission(
        route.params.schoolId,
        creator.userId,
        !creator.canPublishWithoutApproval,
      );
      setSuccessModal(
        creator.canPublishWithoutApproval
          ? 'Organizatör yetkisi kaldırıldı. Yeni etkinlikler tekrar onaya düşecek.'
          : 'Kullanıcı organizatör yapıldı. Yeni etkinlikleri onaysız yayınlayabilir.',
      );
      await load();
    } catch (error) {
      setErrorBanner(error instanceof Error ? error.message : 'Kullanıcı yetkisi güncellenemedi.');
    } finally {
      setPermissionLoadingUserId((current) => (current === creator.userId ? null : current));
    }
  }, [load, route.params.schoolId]);

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <View style={{ gap: spacing.md }}>
          <Input label="Okul adı" value={name} onChangeText={setName} error={errors.name} required />
          <Input label="Kategori" value={category} onChangeText={setCategory} />
          <Input label="Kısa açıklama" value={snippet} onChangeText={setSnippet} multiline />
          <View>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm, marginLeft: spacing.xs }]}>
              Okul kapak görseli
            </Text>
            <View
              style={{
                backgroundColor: '#241626',
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                overflow: 'hidden',
              }}
            >
              {displayImageUri ? (
                <Image
                  source={{ uri: displayImageUri }}
                  style={{ width: '100%', height: 180 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ height: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
                  <Text style={[typography.bodySmall, { color: colors.textTertiary, textAlign: 'center' }]}>
                    Henüz kapak görseli seçilmedi.
                  </Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              <Button
                title={selectedImageUri ? 'Kapak görselini değiştir' : 'Galeriden kapak görseli seç'}
                onPress={() => void pickSchoolImage()}
                fullWidth
              />
              {selectedImageUri ? (
                <Button
                  title="Seçilen görseli kaldır"
                  onPress={() => setSelectedImageUri(null)}
                  variant="outline"
                  fullWidth
                />
              ) : null}
            </View>
          </View>
          <Input
            label="Kapak görseli bağlantısı"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            multiline
          />
        </View>
      );
    }

    if (activeTab === 'location') {
      return (
        <View style={{ gap: spacing.md }}>
          <Input label="Adres" value={address} onChangeText={setAddress} multiline />
          <Input label="Şehir" value={city} onChangeText={setCity} />
          <Input label="İlçe" value={district} onChangeText={setDistrict} />
          <Input label="Enlem" value={latitude} onChangeText={setLatitude} error={errors.latitude} keyboardType="decimal-pad" />
          <Input label="Boylam" value={longitude} onChangeText={setLongitude} error={errors.longitude} keyboardType="decimal-pad" />
        </View>
      );
    }

    if (activeTab === 'lessons') {
      return (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Yeni ders oluştur</Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Mevcut mobil ders oluşturma akışı buradan açılır.
            </Text>
            <Button
              title="Ders oluşturma ekranını aç"
              onPress={() =>
                navigation.navigate('EditClass', {
                  preselectedSchoolId: route.params.schoolId,
                  preselectedSchoolName: school?.name ?? '',
                })
              }
              fullWidth
            />
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
              paddingTop: spacing.lg,
            }}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Bu okuldaki dersler</Text>
            {schoolLessons.length === 0 ? (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz ders yok.</Text>
            ) : (
              schoolLessons.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ClassDetails', { id: lesson.id })}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: '#241626',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                >
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{lesson.title}</Text>
                  {lesson.starts_at ? (
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                      {formatEventDateLabel(lesson.starts_at)}
                    </Text>
                  ) : null}
                  {lesson.location?.trim() ? (
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                      {lesson.location.trim()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      );
    }

    if (activeTab === 'events') {
      return (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Yeni etkinlik oluştur</Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Mevcut mobil etkinlik oluşturma akışı bu okul seçili şekilde açılır.
            </Text>
            <Button
              title="Etkinlik oluşturma ekranını aç"
              onPress={() =>
                navigation.navigate('EditEvent', {
                  preselectedSchoolId: route.params.schoolId,
                  preselectedSchoolName: school?.name ?? '',
                })
              }
              fullWidth
            />
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
              paddingTop: spacing.lg,
            }}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Onay kuyruğu</Text>
            {moderationQueue.length === 0 ? (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Bekleyen veya reddedilmiş etkinlik yok.</Text>
            ) : (
              moderationQueue.map((event) => {
                const statusMeta = getPublishStatusMeta(event.publish_status);
                return (
                  <View
                    key={`review-${event.id}`}
                    style={{
                      marginTop: spacing.sm,
                      padding: spacing.md,
                      backgroundColor: '#241626',
                      borderRadius: radius.xl,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{event.title}</Text>
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
                    <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                      {formatEventDateLabel(event.starts_at)}
                    </Text>
                    {event.location?.trim() ? (
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                        {event.location.trim()}
                      </Text>
                    ) : null}
                    {event.rejection_reason?.trim() ? (
                      <Text style={[typography.caption, { color: '#FCA5A5', marginTop: spacing.sm }]}>
                        Son red bilgisi: {event.rejection_reason.trim()}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                      <Button
                        title="Onayla"
                        size="sm"
                        onPress={() => void handleApproveEvent(event.id)}
                        loading={eventActionLoadingId === event.id}
                        disabled={eventActionLoadingId != null && eventActionLoadingId !== event.id}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Reddet"
                        size="sm"
                        variant="danger"
                        onPress={() => void handleRejectEvent(event.id)}
                        loading={eventActionLoadingId === event.id}
                        disabled={eventActionLoadingId != null && eventActionLoadingId !== event.id}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
              paddingTop: spacing.lg,
            }}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Etkinlik oluşturan kullanıcılar</Text>
            {eventCreators.length === 0 ? (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Bu okul için henüz etkinlik oluşturan kullanıcı yok.</Text>
            ) : (
              eventCreators.map((creator) => (
                <View
                  key={creator.userId}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: '#241626',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                        {creator.displayName}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                        {creator.username ? `@${creator.username}` : 'Kullanıcı adı yok'} · {creator.eventCount} etkinlik
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 6,
                        borderRadius: radius.full,
                        backgroundColor: creator.canPublishWithoutApproval ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <Text style={[typography.captionBold, { color: creator.canPublishWithoutApproval ? '#86EFAC' : '#D1D5DB' }]}>
                        {creator.canPublishWithoutApproval ? 'Organizatör' : 'Standart'}
                      </Text>
                    </View>
                  </View>
                  <Button
                    title={creator.canPublishWithoutApproval ? 'Organizatör yetkisini kaldır' : 'Organizatör yap'}
                    size="sm"
                    variant={creator.canPublishWithoutApproval ? 'outline' : 'primary'}
                    onPress={() => void handleToggleCreatorPermission(creator)}
                    loading={permissionLoadingUserId === creator.userId}
                    disabled={permissionLoadingUserId != null && permissionLoadingUserId !== creator.userId}
                    fullWidth
                  />
                </View>
              ))
            )}
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.cardBorder,
              paddingTop: spacing.lg,
            }}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Bu okuldaki etkinlikler</Text>
            {schoolEvents.length === 0 ? (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz etkinlik yok.</Text>
            ) : (
              schoolEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('EventDetails', { id: event.id, includeUnpublished: true })}
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: '#241626',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                >
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{event.title}</Text>
                  <View
                    style={{
                      marginTop: spacing.sm,
                      alignSelf: 'flex-start',
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      borderRadius: radius.full,
                      backgroundColor: getPublishStatusMeta(event.publish_status).bg,
                    }}
                  >
                    <Text style={[typography.captionBold, { color: getPublishStatusMeta(event.publish_status).fg }]}>
                      {getPublishStatusMeta(event.publish_status).label}
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                    {formatEventDateLabel(event.starts_at)}
                  </Text>
                  {event.location?.trim() ? (
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{event.location.trim()}</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={{ gap: spacing.md }}>
        <Input label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" />
        <Input label="Telefon" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
      </View>
    );
  };

  const onSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Okul adı zorunludur.';
    if (latitude.trim() && parseOptionalFloat(latitude) == null) nextErrors.latitude = 'Geçerli bir enlem girin.';
    if (longitude.trim() && parseOptionalFloat(longitude) == null) nextErrors.longitude = 'Geçerli bir boylam girin.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setErrorBanner(null);
    try {
      const updated = await schoolAdminService.updateManagedSchool(route.params.schoolId, {
        name,
        category,
        snippet,
        address,
        city,
        district,
        latitude: parseOptionalFloat(latitude),
        longitude: parseOptionalFloat(longitude),
        website,
        telephone,
        imageUri: selectedImageUri ?? undefined,
        imageUrl,
      });
      applySchool(updated);
      setSuccessModal('Okul bilgileri güncellendi.');
    } catch (error: unknown) {
      setErrorBanner(error instanceof Error ? error.message : 'Okul güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setErrorBanner(null);
    try {
      await schoolAdminService.deleteManagedSchool(route.params.schoolId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (error: unknown) {
      setDeleteModalVisible(false);
      setErrorBanner(error instanceof Error ? error.message : 'Okul silinemedi.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Okul Paneli" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!school) {
    return (
      <Screen>
        <Header title="Okul Paneli" showBack />
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
          <View
            style={{
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.xl,
            }}
          >
            <Text style={[typography.bodyBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Panel açılamadı</Text>
            <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>
              {errorBanner || 'Bu okul için erişim yetkiniz bulunmuyor veya okul kaydı yüklenemedi.'}
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={school?.name?.trim() || 'Okul Paneli'} showBack />
      <ConfirmModal
        visible={!!successModal}
        title="Kaydedildi"
        message={successModal ?? ''}
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setSuccessModal(null)}
        onConfirm={() => setSuccessModal(null)}
      />
      <ConfirmModal
        visible={deleteModalVisible}
        title="Okulu sil"
        message="Bu okul kaydı silinecek. Bu işlem geri alınamaz."
        confirmVariant="danger"
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        loading={deleting}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => void onDelete()}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        onTouchStart={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={[typography.captionBold, { color: colors.primary, marginBottom: spacing.xs }]}>Yönetici yetkisi</Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>{ownerNote}</Text>
        </View>

        {errorBanner ? (
          <Text style={[typography.caption, { color: colors.error, marginBottom: spacing.md }]}>{errorBanner}</Text>
        ) : null}

        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.lg,
          }}
        >
          <Text style={[typography.captionBold, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Panel menüsü</Text>
          <TabSwitch
            tabs={SCHOOL_ADMIN_TABS.map((tab) => ({ key: tab.id, label: tab.label }))}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as SchoolAdminTabId)}
            containerBgColor="#4B154B"
            indicatorColor={colors.primary}
            textColor="rgba(255,255,255,0.74)"
            activeTextColor="#FFFFFF"
            allowWrap
            height={56}
            fontSize={12}
          />

          <View style={{ marginTop: spacing.lg }}>
            {renderTabContent()}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button title="Değişiklikleri kaydet" onPress={() => void onSave()} loading={saving} fullWidth />
          <Button
            title="Okulu sil"
            onPress={() => setDeleteModalVisible(true)}
            variant="danger"
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

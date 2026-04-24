import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { LessonDateTimeField } from '../../components/instructor/LessonDateTimeField';
import { Chip } from '../../components/ui/Chip';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { Toggle } from '../../components/ui/Toggle';
import { MainStackParamList } from '../../types/navigation';
import { useTheme } from '../../theme';
import { instructorLessonsService, parseLessonStartsAtToIso, parseTlToCents } from '../../services/api/instructorLessons';
import { schoolAdminService, type ManagedSchoolModel } from '../../services/api/schoolAdmin';
import {
  instructorSchoolEventsService,
  type ManagedSchoolEventItem,
  type PublishStatus,
} from '../../services/api/schoolEvents';

type Props = NativeStackScreenProps<MainStackParamList, 'SchoolAdminPanel'>;
type SchoolAdminTabId = 'overview' | 'locationContact' | 'lessons' | 'events';
const LESSON_LEVELS = ['Başlangıç', 'Orta', 'İleri'] as const;
const LESSON_FORMAT_OPTIONS = ['Özel ders', 'Grup dersi'] as const;
const LESSON_DELIVERY_OPTIONS = ['Online', 'Yüz yüze'] as const;
const LESSON_CURRENCIES = [
  { code: 'TRY', label: 'TL' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
] as const;

const SCHOOL_ADMIN_TABS: { id: SchoolAdminTabId; label: string }[] = [
  { id: 'overview', label: 'Genel' },
  { id: 'locationContact', label: 'Okul Bilgileri' },
  { id: 'lessons', label: 'Dersler' },
  { id: 'events', label: 'Etkinlikler' },
];

function parseOptionalFloat(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseParticipantLimit(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getPublishStatusMeta(status: PublishStatus | null | undefined): { label: string; bg: string; fg: string } {
  if (status === 'approved') return { label: 'Yayında', bg: 'rgba(34,197,94,0.14)', fg: '#86EFAC' };
  if (status === 'rejected') return { label: 'Reddedildi', bg: 'rgba(239,68,68,0.14)', fg: '#FCA5A5' };
  return { label: 'Onay Bekliyor', bg: 'rgba(245,158,11,0.16)', fg: '#FCD34D' };
}

function sortEventsByStartsAt(items: ManagedSchoolEventItem[]): ManagedSchoolEventItem[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.starts_at).getTime();
    const bTime = new Date(b.starts_at).getTime();

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return aTime - bTime;
  });
}

export const SchoolAdminPanelScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<SchoolAdminTabId>('overview');
  const [school, setSchool] = useState<ManagedSchoolModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<string | null>(null);
  const [lessonsSheetVisible, setLessonsSheetVisible] = useState(false);
  const [schoolEventsSheetVisible, setSchoolEventsSheetVisible] = useState(false);
  const [schoolEvents, setSchoolEvents] = useState<ManagedSchoolEventItem[]>([]);
  const [schoolLessons, setSchoolLessons] = useState<ManagedSchoolEventItem[]>([]);

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
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonLocation, setLessonLocation] = useState('');
  const [lessonCity, setLessonCity] = useState('');
  const [lessonStartsAt, setLessonStartsAt] = useState<Date | null>(null);
  const [lessonPriceText, setLessonPriceText] = useState('');
  const [lessonParticipantLimitText, setLessonParticipantLimitText] = useState('');
  const [lessonLevel, setLessonLevel] = useState<(typeof LESSON_LEVELS)[number]>('Başlangıç');
  const [lessonFormat, setLessonFormat] = useState<(typeof LESSON_FORMAT_OPTIONS)[number]>('Grup dersi');
  const [lessonDelivery, setLessonDelivery] = useState<(typeof LESSON_DELIVERY_OPTIONS)[number]>('Yüz yüze');
  const [lessonCurrency, setLessonCurrency] = useState<string>('TRY');
  const [lessonPublished, setLessonPublished] = useState(true);
  const [lessonSaving, setLessonSaving] = useState(false);

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
      const [row, eventRows] = await Promise.all([
        schoolAdminService.getManagedSchool(route.params.schoolId),
        instructorSchoolEventsService.listMine().catch(() => []),
      ]);
      if (!row) {
        setSchool(null);
        setSchoolEvents([]);
        setSchoolLessons([]);
        setErrorBanner('Okul bulunamadı.');
      } else {
        applySchool(row);
      }
      setSchoolEvents(
        sortEventsByStartsAt(
          (eventRows ?? []).filter((item) => item.school_id === route.params.schoolId && item.event_type !== 'lesson'),
        ),
      );
      setSchoolLessons(
        sortEventsByStartsAt(
          (eventRows ?? []).filter((item) => item.school_id === route.params.schoolId && item.event_type === 'lesson'),
        ),
      );
    } catch (error: unknown) {
      setSchool(null);
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
  const displayImageUri = selectedImageUri?.trim() || imageUrl.trim();
  const lessonSelectedParticipantLimit =
    lessonFormat === 'Özel ders' ? 1 : parseParticipantLimit(lessonParticipantLimitText);

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

  const resetLessonCreateForm = useCallback(() => {
    setLessonTitle('');
    setLessonDescription('');
    setLessonLocation('');
    setLessonCity(school?.city ?? '');
    setLessonStartsAt(null);
    setLessonPriceText('');
    setLessonParticipantLimitText('');
    setLessonLevel('Başlangıç');
    setLessonFormat('Grup dersi');
    setLessonDelivery('Yüz yüze');
    setLessonCurrency('TRY');
    setLessonPublished(true);
  }, [school?.city]);

  const handleCreateLesson = useCallback(async () => {
    if (!lessonTitle.trim()) {
      setErrorBanner('Ders adı gerekli.');
      return;
    }
    if (!lessonStartsAt) {
      setErrorBanner('Ders başlangıç tarihi gerekli.');
      return;
    }
    const participantLimit = lessonSelectedParticipantLimit;
    if (lessonFormat !== 'Özel ders' && lessonParticipantLimitText.trim() && !participantLimit) {
      setErrorBanner('Katılımcı sayısı geçerli değil.');
      return;
    }
    const priceCents = parseTlToCents(lessonPriceText);
    setLessonSaving(true);
    setErrorBanner(null);
    try {
      await instructorLessonsService.create({
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        location: lessonLocation.trim() || null,
        city: lessonCity.trim() || school?.city || null,
        priceCents,
        participantLimit,
        currency: lessonCurrency,
        level: lessonLevel,
        lessonFormat: lessonFormat === 'Özel ders' ? 'private' : 'group',
        lessonDelivery: lessonDelivery === 'Online' ? 'online' : 'in_person',
        isPublished: lessonPublished,
        schoolId: route.params.schoolId,
        startsAt: parseLessonStartsAtToIso(lessonStartsAt),
      });
      setSuccessModal('Ders oluşturuldu.');
      resetLessonCreateForm();
      await load();
    } catch (error) {
      setErrorBanner(error instanceof Error ? error.message : 'Ders oluşturulamadı.');
    } finally {
      setLessonSaving(false);
    }
  }, [
    lessonCurrency,
    lessonDelivery,
    lessonDescription,
    lessonLevel,
    lessonLocation,
    lessonParticipantLimitText,
    lessonFormat,
    lessonPriceText,
    lessonPublished,
    lessonStartsAt,
    lessonTitle,
    lessonSelectedParticipantLimit,
    load,
    resetLessonCreateForm,
    route.params.schoolId,
  ]);

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

    if (activeTab === 'locationContact') {
      return (
        <View style={{ gap: spacing.md }}>
          <Input label="Adres" value={address} onChangeText={setAddress} multiline />
          <Input label="Şehir" value={city} onChangeText={setCity} />
          <Input label="İlçe" value={district} onChangeText={setDistrict} />
          <Input label="Enlem" value={latitude} onChangeText={setLatitude} error={errors.latitude} keyboardType="decimal-pad" />
          <Input label="Boylam" value={longitude} onChangeText={setLongitude} error={errors.longitude} keyboardType="decimal-pad" />
          <Input label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <Input label="Telefon" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
        </View>
      );
    }

    if (activeTab === 'lessons') {
      return (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Yeni ders oluştur</Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Dersi bu ekrandan doğrudan kaydedebilirsin.
            </Text>
            <Input label="Ders adı" value={lessonTitle} onChangeText={setLessonTitle} required />
            <LessonDateTimeField
              label="Başlangıç tarihi ve saati"
              helperText="Dersin ne zaman başlayacağını seç."
              emptyText="Tarih seçmek için dokun"
              value={lessonStartsAt}
              onChange={setLessonStartsAt}
            />
            <Input label="Mekan" value={lessonLocation} onChangeText={setLessonLocation} placeholder="Örn. Kadıköy Dans Stüdyosu" />
            <Input label="Şehir" value={lessonCity} onChangeText={setLessonCity} placeholder="İsteğe bağlı" />
            <Input
              label="Açıklama"
              value={lessonDescription}
              onChangeText={setLessonDescription}
              placeholder="İsteğe bağlı"
              multiline
            />
            <View>
              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Seviye</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {LESSON_LEVELS.map((level) => (
                  <View key={level} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={level} selected={lessonLevel === level} onPress={() => setLessonLevel(level)} />
                  </View>
                ))}
              </View>
            </View>
            <View>
              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Ders formatı</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {LESSON_FORMAT_OPTIONS.map((option) => (
                  <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip
                      label={option}
                      selected={lessonFormat === option}
                      onPress={() => {
                        setLessonFormat(option);
                        if (option === 'Özel ders') {
                          setLessonParticipantLimitText('1');
                        } else if (lessonParticipantLimitText.trim() === '1') {
                          setLessonParticipantLimitText('');
                        }
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
            <View>
              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Katılım şekli</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {LESSON_DELIVERY_OPTIONS.map((option) => (
                  <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={option} selected={lessonDelivery === option} onPress={() => setLessonDelivery(option)} />
                  </View>
                ))}
              </View>
            </View>
            <View>
              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Para birimi</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {LESSON_CURRENCIES.map((option) => (
                  <View key={option.code} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={option.label} selected={lessonCurrency === option.code} onPress={() => setLessonCurrency(option.code)} />
                  </View>
                ))}
              </View>
            </View>
            <Input
              label={`Ücret (${lessonCurrency})`}
              value={lessonPriceText}
              onChangeText={setLessonPriceText}
              placeholder="Boş = ücretsiz"
              keyboardType="decimal-pad"
            />
            <Input
              label={lessonFormat === 'Özel ders' ? 'Katılımcı sayısı' : 'Katılımcı sayısı'}
              value={lessonParticipantLimitText}
              onChangeText={setLessonParticipantLimitText}
              placeholder={lessonFormat === 'Özel ders' ? '1' : 'Boş = limitsiz'}
              keyboardType="number-pad"
              editable={lessonFormat !== 'Özel ders'}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: spacing.xs,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: '#241626',
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Yayında</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Kapalıysa yalnızca sen görürsün.
                </Text>
              </View>
              <Toggle value={lessonPublished} onValueChange={setLessonPublished} />
            </View>
            <Button
              title="Dersi oluştur"
              onPress={() => void handleCreateLesson()}
              loading={lessonSaving}
              fullWidth
            />
          </View>

          <Button
            title={`Bu okuldaki dersler (${schoolLessons.length})`}
            onPress={() => setLessonsSheetVisible(true)}
            variant="outline"
            textStyle={{ color: '#FFFFFF' }}
            fullWidth
          />
        </View>
      );
    }

    if (activeTab === 'events') {
      return (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              Görsel ve video alanı dahil aynı etkinlik oluşturma ekranını açar.
            </Text>
            <Button
              title="Etkinlik oluştur ekranını aç"
              onPress={() =>
                navigation.navigate('EditEvent', {
                  preselectedSchoolId: route.params.schoolId,
                  preselectedSchoolName: school?.name ?? '',
                })
              }
              fullWidth
            />
          </View>

          <Button
            title={`Bu okuldaki etkinlikler (${schoolEvents.length})`}
            onPress={() => setSchoolEventsSheetVisible(true)}
            variant="outline"
            textStyle={{ color: '#FFFFFF' }}
            fullWidth
          />
        </View>
      );
    }

    return null;
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
      <Modal
        visible={lessonsSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLessonsSheetVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setLessonsSheetVisible(false)}
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
            <View
              style={{
                alignSelf: 'center',
                width: 44,
                height: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
                marginBottom: spacing.md,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Bu okuldaki dersler</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Ders detaylarını görüntülemek için bir öğeye dokun.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setLessonsSheetVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {schoolLessons.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz ders yok.</Text>
              ) : (
                schoolLessons.map((lesson) => (
                  <TouchableOpacity
                    key={lesson.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      setLessonsSheetVisible(false);
                      navigation.navigate('ClassDetails', { id: lesson.id });
                    }}
                    style={{
                      marginBottom: spacing.sm,
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
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={schoolEventsSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSchoolEventsSheetVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setSchoolEventsSheetVisible(false)}
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
            <View
              style={{
                alignSelf: 'center',
                width: 44,
                height: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.18)',
                marginBottom: spacing.md,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Bu okuldaki etkinlikler</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Etkinlik detaylarını görüntülemek veya düzenlemek için seç.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSchoolEventsSheetVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {schoolEvents.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz etkinlik yok.</Text>
              ) : (
                schoolEvents.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      marginBottom: spacing.sm,
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
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                      <Button
                        title="Detay"
                        size="sm"
                        variant="outline"
                        onPress={() => {
                          setSchoolEventsSheetVisible(false);
                          navigation.navigate('EventDetails', { id: event.id, includeUnpublished: true });
                        }}
                        style={{ flex: 1 }}
                        textStyle={{ color: '#FFFFFF' }}
                      />
                      <Button
                        title="Düzenle"
                        size="sm"
                        onPress={() => {
                          setSchoolEventsSheetVisible(false);
                          navigation.navigate('EditEvent', {
                            eventId: event.id,
                            preselectedSchoolId: route.params.schoolId,
                            preselectedSchoolName: school?.name ?? '',
                          });
                        }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

        {activeTab === 'overview' || activeTab === 'locationContact' ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Button title="Değişiklikleri kaydet" onPress={() => void onSave()} loading={saving} fullWidth />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

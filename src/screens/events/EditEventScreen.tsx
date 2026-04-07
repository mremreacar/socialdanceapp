import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { instructorProfileService } from '../../services/api/instructorProfile';
import { listSchools, type SchoolRow } from '../../services/api/schools';
import { createSchoolEvent, creatorSchoolEventsService } from '../../services/api/schoolEvents';
import { MainStackParamList } from '../../types/navigation';

const formatEventDateTime = (d: Date): string => {
  const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${timeStr}`;
};

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAY_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

type CalendarDay = { date: Date; day: number; isCurrentMonth: boolean; isToday: boolean };

function getCalendarWeeks(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const startPadding = firstWeekday;
  const totalCells = Math.ceil((startPadding + daysInMonth) / 7) * 7;
  const days: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - startPadding + 1;
    if (dayIndex < 1) {
      const d = new Date(year, month, dayIndex);
      days.push({
        date: d,
        day: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
      });
    } else if (dayIndex > daysInMonth) {
      const d = new Date(year, month + 1, dayIndex - daysInMonth);
      days.push({
        date: d,
        day: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
      });
    } else {
      const d = new Date(year, month, dayIndex);
      const dNorm = new Date(d);
      dNorm.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        day: dayIndex,
        isCurrentMonth: true,
        isToday: dNorm.getTime() === today.getTime(),
      });
    }
  }
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < days.length; w += 7) {
    weeks.push(days.slice(w, w + 7));
  }
  return weeks;
}

function getTimeOptions(): { date: Date; label: string }[] {
  const options: { date: Date; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const d = new Date(2000, 0, 1, h, m, 0, 0);
      const label = `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
      options.push({ date: d, label });
    }
  }
  return options;
}

const TIME_OPTIONS = getTimeOptions();

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

const EVENT_TYPE_OPTIONS = [
  { value: 'event' as const, label: 'Etkinlik', hint: 'Parti, sosyal, workshop veya festival gibi kayıtlar için.' },
  { value: 'lesson' as const, label: 'Ders', hint: 'Yalnızca eğitmen profili olan hesaplar için.' },
];

type Nav = NativeStackNavigationProp<MainStackParamList>;
type EditEventRoute = RouteProp<MainStackParamList, 'EditEvent'>;

export const EditEventScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<EditEventRoute>();
  const { colors, spacing, typography, radius, borders } = useTheme();
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;
  const {
    catalog,
    loading: danceCatalogLoading,
    error: danceCatalogError,
    reload: reloadDanceCatalog,
    compactBySubId,
  } = useDanceCatalog();
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [eventDateTime, setEventDateTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasInstructorProfile, setHasInstructorProfile] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'event' | 'lesson'>('event');
  const [showEventTypePicker, setShowEventTypePicker] = useState(false);
  const [selectedDanceTypeId, setSelectedDanceTypeId] = useState<string | null>(null);
  const [showDancePicker, setShowDancePicker] = useState(false);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [participantLimit, setParticipantLimit] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; goBackOnClose?: boolean } | null>(null);
  const timeListRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );
  const selectedEventTypeMeta = useMemo(
    () => EVENT_TYPE_OPTIONS.find((option) => option.value === selectedEventType) ?? EVENT_TYPE_OPTIONS[0],
    [selectedEventType],
  );
  const danceSections = useMemo(
    () =>
      catalog.map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        options:
          category.subcategories.length > 0
            ? category.subcategories.map((sub) => ({ id: sub.id, name: sub.name }))
            : [{ id: category.id, name: category.name }],
      })),
    [catalog],
  );
  const selectedDanceTypeLabel = selectedDanceTypeId ? compactBySubId.get(selectedDanceTypeId) ?? '' : '';
  const screenTitle = isEditing ? 'Etkinlik Düzenle' : 'Etkinlik Oluştur';
  const submitLabel = isEditing ? 'Güncelle' : 'Yayınla';

  const loadInstructorAccess = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setHasInstructorProfile(false);
      setSelectedEventType((prev) => (prev === 'lesson' ? 'event' : prev));
      return;
    }

    try {
      const row = await instructorProfileService.getMine();
      const allowed = !!row;
      setHasInstructorProfile(allowed);
      if (!allowed) {
        setSelectedEventType((prev) => (isEditing && prev === 'lesson' ? prev : 'event'));
      }
    } catch {
      setHasInstructorProfile(false);
      setSelectedEventType((prev) => (isEditing && prev === 'lesson' ? prev : 'event'));
    }
  }, [isEditing]);

  const loadEditableEvent = useCallback(async () => {
    if (!eventId) {
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    try {
      const row = await creatorSchoolEventsService.getMineById(eventId);
      if (!row) {
        setAlertModal({
          title: 'Etkinlik bulunamadı',
          message: 'Bu etkinlik artık mevcut değil veya düzenleme yetkiniz bulunmuyor.',
          goBackOnClose: true,
        });
        return;
      }

      setSelectedSchoolId(row.school_id ?? null);
      setEventName(row.title?.trim() || '');
      setSelectedEventType(row.event_type === 'lesson' ? 'lesson' : 'event');
      setDescription(row.description?.trim() || '');
      setLocationAddress(row.location?.trim() || null);
      setLocationCity(row.city?.trim() || null);
      setParticipantLimit(
        typeof row.participant_limit === 'number' && row.participant_limit > 0 ? String(row.participant_limit) : '',
      );
      setTicketPrice(
        row.price_amount != null && String(row.price_amount).trim() ? String(row.price_amount).trim() : '',
      );
      setSelectedDanceTypeId(row.dance_type_ids[0] ?? null);
      setEventDateTime(row.starts_at ? new Date(row.starts_at) : null);
      setErrors({});
    } catch (error) {
      setAlertModal({
        title: 'Etkinlik yüklenemedi',
        message: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
        goBackOnClose: true,
      });
    } finally {
      setInitialLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      void loadInstructorAccess();
    }, [loadInstructorAccess]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadEditableEvent();
    }, [loadEditableEvent]),
  );

  const validateAndPublish = useCallback(async () => {
    const parsedParticipantLimit = parseParticipantLimit(participantLimit);
    const parsedTicketPrice = parseTicketPrice(ticketPrice);
    const next: Record<string, string> = {};
    if (!eventName.trim()) next.eventName = 'Etkinlik adı zorunludur';
    if (!description.trim()) next.description = 'Açıklama zorunludur';
    if (!eventDateTime) next.dateTime = 'Tarih ve saat seçiniz';
    if (!locationAddress) next.location = 'Konum seçiniz';
    if (!selectedDanceTypeId) next.danceType = 'Dans türü seçiniz';
    if (!participantLimit.trim()) next.participantLimit = 'Katılımcı limiti zorunludur';
    else if (parsedParticipantLimit == null) next.participantLimit = 'Geçerli bir katılımcı limiti giriniz';
    if (!ticketPrice.trim()) next.ticketPrice = 'Bilet fiyatı zorunludur';
    else if (parsedTicketPrice == null) next.ticketPrice = 'Geçerli bir bilet fiyatı giriniz';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setAlertModal({ title: 'Eksik Bilgi', message: 'Lütfen tüm zorunlu alanları doldurun.' });
      return;
    }

    if (selectedEventType === 'lesson' && !hasInstructorProfile) {
      setAlertModal({
        title: 'Erişim gerekli',
        message: 'Ders oluşturmak için önce eğitmen profili oluşturmanız gerekiyor.',
      });
      return;
    }

    if (!eventDateTime || parsedParticipantLimit == null || parsedTicketPrice == null) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId: selectedSchoolId,
        title: eventName,
        startsAt: eventDateTime.toISOString(),
        city: locationCity,
        location: locationAddress,
        description,
        participantLimit: parsedParticipantLimit,
        priceAmount: parsedTicketPrice,
        priceCurrency: 'TRY',
        eventType: selectedEventType,
        danceTypeIds: selectedDanceTypeId ? [selectedDanceTypeId] : [],
        locationPlace: {
          address: locationAddress,
          formatted_address: locationAddress,
          city: locationCity,
        },
      };

      if (eventId) {
        await creatorSchoolEventsService.updateMine(eventId, payload);
      } else {
        await createSchoolEvent(payload);
      }

      setAlertModal({
        title: isEditing ? 'Etkinlik güncellendi' : 'Etkinlik oluşturuldu',
        message: isEditing ? 'Etkinlik bilgileri başarıyla güncellendi.' : 'Etkinlik başarıyla kaydedildi.',
        goBackOnClose: true,
      });
    } catch (error) {
      setAlertModal({
        title: isEditing ? 'Etkinlik güncellenemedi' : 'Etkinlik oluşturulamadı',
        message: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
      });
    } finally {
      setSaving(false);
    }
  }, [description, eventDateTime, eventId, eventName, hasInstructorProfile, isEditing, locationAddress, locationCity, participantLimit, selectedDanceTypeId, selectedEventType, selectedSchoolId, ticketPrice]);

  useEffect(() => {
    if (showDatePicker) {
      const t = setTimeout(() => timeListRef.current?.scrollTo({ y: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [showDatePicker]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSchoolsLoading(true);
      try {
        const rows = await listSchools({ limit: 200 });
        if (!cancelled) {
          setSchools(rows);
          setSelectedSchoolId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : null));
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
          setSelectedSchoolId(null);
        }
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openDatePicker = () => {
    if (eventDateTime) {
      setTempDate(eventDateTime);
      setViewMonth(eventDateTime);
      const t = new Date(2000, 0, 1, eventDateTime.getHours(), eventDateTime.getMinutes(), 0, 0);
      setTempTime(t);
    } else {
      const now = new Date();
      setTempDate(now);
      setViewMonth(now);
      setTempTime(now);
    }
    setShowDatePicker(true);
  };

  const onSelectDate = (d: Date) => {
    setTempDate(d);
  };

  const canSelectDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dNorm = new Date(day.date);
    dNorm.setHours(0, 0, 0, 0);
    return dNorm.getTime() >= today.getTime();
  };

  const prevMonth = () => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  const calendarWeeks = useMemo(
    () => getCalendarWeeks(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth.getFullYear(), viewMonth.getMonth()],
  );

  const onSelectTime = (t: Date) => {
    const dateToUse = tempDate || new Date();
    const result = new Date(dateToUse);
    result.setHours(t.getHours(), t.getMinutes(), 0, 0);
    setEventDateTime(result);
    setErrors((e) => ({ ...e, dateTime: '' }));
    setShowDatePicker(false);
  };

  const selectedTimeIndex = useMemo(() => {
    if (!tempTime) return 0;
    const h = tempTime.getHours();
    const m = tempTime.getMinutes();
    return (h * 2) + (m === 30 ? 1 : 0);
  }, [tempTime]);

  const addMedia = async () => {
    let ImagePicker: typeof import('expo-image-picker') | null = null;
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean) as string[];
        setMediaUris((prev) => [...prev, ...uris]);
      }
    } catch {
      // Kullanıcı iptal etti veya hata
    }
  };

  const removeMedia = (index: number) => {
    setMediaUris((prev) => prev.filter((_, i) => i !== index));
  };

  const pickLocation = async () => {
    setLocationLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = results?.[0];
      if (addr && typeof addr === 'object') {
        const parts = Object.values(addr).filter((v): v is string => typeof v === 'string' && v.length > 0);
        setLocationAddress(parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setLocationCity(
          typeof addr.city === 'string' && addr.city.trim()
            ? addr.city.trim()
            : typeof addr.subregion === 'string' && addr.subregion.trim()
            ? addr.subregion.trim()
            : null,
        );
      } else {
        setLocationAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setLocationCity(null);
      }
      setErrors((e) => ({ ...e, location: '' }));
    } catch {
      // İzin reddedildi veya konum alınamadı
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Screen>
      <ConfirmModal
        visible={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAlertModal(null)}
        onConfirm={() => {
          const shouldGoBack = alertModal?.goBackOnClose === true;
          setAlertModal(null);
          if (shouldGoBack) navigation.goBack();
        }}
      />
      <Header
        title={screenTitle}
        showBack
        rightIcon="check"
        onRightPress={initialLoading ? undefined : () => void validateAndPublish()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {initialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.bodySmall, { color: '#9CA3AF', marginTop: spacing.sm }]}>
              Etkinlik bilgileri yükleniyor...
            </Text>
          </View>
        ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 320 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View>
          <View style={styles.labelRow}>
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="school" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Bağlı Okul</Text>
          </View>
          <View style={{ height: spacing.xs }} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => !schoolsLoading && setShowSchoolPicker(true)}
            disabled={schoolsLoading}
            style={[
              styles.dateInputRow,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.xl,
                borderWidth: borders.thin,
                borderColor: errors.school ? colors.error : 'rgba(255,255,255,0.12)',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            {schoolsLoading ? (
              <>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[typography.body, { color: '#9CA3AF', marginLeft: spacing.sm, flex: 1 }]}>
                  Okullar yükleniyor...
                </Text>
              </>
            ) : (
              <>
                <Text style={[typography.body, { color: selectedSchool ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                  {selectedSchool?.name || 'İstersen okul seç'}
                </Text>
                <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
              </>
            )}
          </TouchableOpacity>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.xs }]}>
            Sokakta veya bağımsız düzenlenen etkinliklerde bu alanı boş bırakabilirsin.
          </Text>
        </View>
        <Input
          label="Etkinlik adı"
          placeholder=""
          value={eventName}
          onChangeText={(t) => { setEventName(t); if (errors.eventName) setErrors((e) => ({ ...e, eventName: '' })); }}
          leftIcon="domain"
          leftIconColor={colors.primary}
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          error={errors.eventName}
          required
        />
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="shape-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Etkinlik Tipi</Text>
          </View>
          <View style={{ height: spacing.xs }} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowEventTypePicker(true)}
            style={[
              styles.dateInputRow,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.xl,
                borderWidth: borders.thin,
                borderColor: 'rgba(255,255,255,0.12)',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.body, { color: '#FFFFFF' }]} numberOfLines={1}>
                {selectedEventTypeMeta.label}
              </Text>
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={2}>
                {selectedEventTypeMeta.hint}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {!hasInstructorProfile ? (
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.xs }]}>
              Eğitmen profili olmayan hesaplar yalnızca etkinlik tipi ile kayıt oluşturabilir.
            </Text>
          ) : null}
        </View>
        <Input
          label="Açıklama"
          placeholder=""
          value={description}
          onChangeText={(t) => { setDescription(t); if (errors.description) setErrors((e) => ({ ...e, description: '' })); }}
          leftIcon="file-document-outline"
          leftIconColor={colors.primary}
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          multiline
          error={errors.description}
          required
        />
        <View style={{ marginTop: spacing.lg }}>
          <View style={styles.labelRow}>
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="calendar" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Tarih ve Saat</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
          </View>
          <View style={{ height: spacing.xs }} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openDatePicker}
            style={[
              styles.dateInputRow,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.xl,
                borderWidth: borders.thin,
                borderColor: errors.dateTime ? colors.error : 'rgba(255,255,255,0.12)',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.body, { color: eventDateTime ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
              {eventDateTime ? formatEventDateTime(eventDateTime) : ''}
            </Text>
            <Icon name="pencil" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
          </TouchableOpacity>
          {errors.dateTime ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.dateTime}</Text> : null}
        </View>

        {showDatePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalContainer}>
              <TouchableOpacity
                activeOpacity={1}
                style={styles.modalOverlay}
                onPress={() => setShowDatePicker(false)}
              />
              <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e' }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={12}>
                    <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                  </TouchableOpacity>
                  <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>
                    Tarih ve saat seçin
                  </Text>
                  <View style={{ width: 40 }} />
                </View>

                <View style={styles.calendarSection}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={prevMonth} style={styles.calendarNav} hitSlop={8}>
                      <Icon name="chevron-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={[typography.h3, { color: '#FFFFFF', fontWeight: '700' }]}>
                      {MONTHS_TR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.calendarNav} hitSlop={8}>
                      <Icon name="chevron-right" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_TR.map((wd) => (
                      <Text key={wd} style={[typography.caption, { color: 'rgba(255,255,255,0.6)', flex: 1, textAlign: 'center' }]}>
                        {wd}
                      </Text>
                    ))}
                  </View>
                  {calendarWeeks.map((week, wi) => (
                    <View key={wi} style={styles.calendarWeek}>
                      {week.map((cell) => {
                        const selected = tempDate && isSameDay(cell.date, tempDate);
                        const selectable = canSelectDay(cell);
                        return (
                          <TouchableOpacity
                            key={cell.date.getTime()}
                            style={[
                              styles.calendarDay,
                              !cell.isCurrentMonth && styles.calendarDayOther,
                              !selectable && cell.isCurrentMonth && styles.calendarDayDisabled,
                            ]}
                            onPress={() => selectable && onSelectDate(cell.date)}
                            disabled={!selectable}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.calendarDayInner,
                                selected && { backgroundColor: colors.primary },
                              ]}
                            >
                              <Text
                                style={[
                                  typography.body,
                                  {
                                    color: !cell.isCurrentMonth ? 'rgba(255,255,255,0.4)' : selected ? '#FFFFFF' : '#FFFFFF',
                                    fontWeight: cell.isToday && !selected ? '700' : '400',
                                  },
                                ]}
                              >
                                {cell.day}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>

                <View style={[styles.timeCard, { backgroundColor: colors.background, borderRadius: radius.xl }]}>
                  {tempDate && (
                    <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>
                      {tempDate.getDate() === new Date().getDate() &&
                      tempDate.getMonth() === new Date().getMonth() &&
                      tempDate.getFullYear() === new Date().getFullYear()
                        ? 'Bugün'
                        : `${tempDate.getDate()} ${MONTHS_TR[tempDate.getMonth()]} ${tempDate.getFullYear()}`}
                    </Text>
                  )}
                  <ScrollView
                    ref={timeListRef}
                    style={styles.timeListScroll}
                    contentContainerStyle={styles.pickerScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {TIME_OPTIONS.map((opt, index) => (
                      <TouchableOpacity
                        key={`${opt.label}-${index}`}
                        style={[
                          styles.pickerRow,
                          { backgroundColor: index === selectedTimeIndex ? 'rgba(255,255,255,0.12)' : 'transparent' },
                        ]}
                        onPress={() => onSelectTime(opt.date)}
                        activeOpacity={0.7}
                      >
                        <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{opt.label}</Text>
                        {index === selectedTimeIndex && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>
        )}
        {showSchoolPicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalContainer}>
              <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowSchoolPicker(false)} />
              <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '55%' }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                  <TouchableOpacity onPress={() => setShowSchoolPicker(false)} hitSlop={12}>
                    <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                  </TouchableOpacity>
                  <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Okul seçin</Text>
                  <View style={{ width: 40 }} />
                </View>
                <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.pickerRow, { backgroundColor: selectedSchoolId === null ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                    onPress={() => {
                      setSelectedSchoolId(null);
                      setShowSchoolPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: spacing.md }}>
                      <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]} numberOfLines={1}>
                        Bağımsız etkinlik
                      </Text>
                      <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={2}>
                        Sokakta, açık alanda veya bir okula bağlı olmayan etkinlik
                      </Text>
                    </View>
                    {selectedSchoolId === null && <Icon name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                  {schools.length === 0 ? (
                    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xl }}>
                      <Text style={[typography.bodySmall, { color: '#9CA3AF', textAlign: 'center' }]}>
                        Şu anda seçilebilir okul bulunamadı. İstersen bağımsız etkinlik olarak devam edebilirsin.
                      </Text>
                    </View>
                  ) : (
                    schools.map((school) => (
                      <TouchableOpacity
                        key={school.id}
                        style={[styles.pickerRow, { backgroundColor: selectedSchoolId === school.id ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                        onPress={() => {
                          setSelectedSchoolId(school.id);
                          setShowSchoolPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.md }}>
                          <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]} numberOfLines={1}>
                            {school.name}
                          </Text>
                          {!!school.city && (
                            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={1}>
                              {school.city}
                              {school.district ? `, ${school.district}` : ''}
                            </Text>
                          )}
                        </View>
                        {selectedSchoolId === school.id && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
        {showEventTypePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalContainer}>
              <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowEventTypePicker(false)} />
              <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '40%' }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                  <TouchableOpacity onPress={() => setShowEventTypePicker(false)} hitSlop={12}>
                    <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                  </TouchableOpacity>
                  <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Etkinlik tipi seçin</Text>
                  <View style={{ width: 40 }} />
                </View>
                <View style={{ paddingVertical: 8 }}>
                  {EVENT_TYPE_OPTIONS.map((option) => {
                    const selected = selectedEventType === option.value;
                    const disabled = option.value === 'lesson' && !hasInstructorProfile;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerRow,
                          { backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent', opacity: disabled ? 0.55 : 1 },
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          setSelectedEventType(option.value);
                          setShowEventTypePicker(false);
                        }}
                        activeOpacity={disabled ? 1 : 0.7}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.md }}>
                          <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{option.label}</Text>
                          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>{option.hint}</Text>
                        </View>
                        {disabled ? (
                          <Icon name="lock-outline" size={20} color="#9CA3AF" />
                        ) : selected ? (
                          <Icon name="check" size={20} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>
        )}
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="map-marker" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Konum / Yer</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
          </View>
          <View style={{ height: spacing.xs }} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={pickLocation}
            disabled={locationLoading}
            style={[
              styles.dateInputRow,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.xl,
                borderWidth: borders.thin,
                borderColor: errors.location ? colors.error : 'rgba(255,255,255,0.12)',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.body, { color: locationAddress ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={2}>
              {locationLoading ? 'Konum alınıyor...' : locationAddress || 'Konum seçin'}
            </Text>
            <Icon name={locationAddress ? 'pencil' : 'map-marker'} size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
          </TouchableOpacity>
          {errors.location ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.location}</Text> : null}
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="music" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Dans Türü</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
          </View>
          <View style={{ height: spacing.xs }} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDancePicker(true)}
            style={[
              styles.dateInputRow,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.xl,
                borderWidth: borders.thin,
                borderColor: errors.danceType ? colors.error : 'rgba(255,255,255,0.12)',
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.body, { color: selectedDanceTypeLabel ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
              {selectedDanceTypeLabel || 'Dans türü seçin'}
            </Text>
            <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
          </TouchableOpacity>
          {errors.danceType ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.danceType}</Text> : null}
        </View>

        {showDancePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalContainer}>
              <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowDancePicker(false)} />
              <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '50%' }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                <TouchableOpacity onPress={() => setShowDancePicker(false)} hitSlop={12}>
                  <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                </TouchableOpacity>
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Dans türü seçin</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                {danceCatalogLoading ? (
                  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.sm }]}>Dans türleri yükleniyor...</Text>
                  </View>
                ) : danceCatalogError ? (
                  <View style={{ paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center' }}>
                    <Text style={[typography.caption, { color: colors.error, textAlign: 'center' }]}>{danceCatalogError}</Text>
                    <TouchableOpacity
                      onPress={reloadDanceCatalog}
                      style={{ marginTop: spacing.md }}
                      hitSlop={8}
                    >
                      <Text style={[typography.captionBold, { color: colors.primary }]}>Tekrar dene</Text>
                    </TouchableOpacity>
                  </View>
                ) : danceSections.length === 0 ? (
                  <Text style={[typography.caption, { color: '#9CA3AF', textAlign: 'center', paddingVertical: spacing.xl }]}>
                    Dans türü bulunamadı.
                  </Text>
                ) : (
                  danceSections.map((section) => (
                    <View key={section.categoryId} style={{ marginBottom: spacing.md }}>
                      <Text style={[typography.captionBold, { color: '#9CA3AF', paddingHorizontal: spacing.lg, marginBottom: spacing.xs }]}>
                        {section.categoryName}
                      </Text>
                      {section.options.map((option) => {
                        const selected = selectedDanceTypeId === option.id;
                        return (
                          <TouchableOpacity
                            key={option.id}
                            style={[styles.pickerRow, { backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                            onPress={() => {
                              setSelectedDanceTypeId(option.id);
                              setErrors((e) => ({ ...e, danceType: '' }));
                              setShowDancePicker(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{option.name}</Text>
                            {selected ? <Icon name="check" size={20} color={colors.primary} /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </ScrollView>
              </View>
            </View>
          </Modal>
        )}
        <View style={{ marginTop: spacing.lg }}>
          <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
            <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name="image-multiple-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.label, { color: '#9CA3AF' }]}>Görsel ve Videolar</Text>
          </View>
          <View style={[styles.mediaInputBox, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl, padding: spacing.lg }]}>
            <View style={styles.mediaRow}>
              {mediaUris.map((uri, index) => (
                <View key={index} style={[styles.mediaThumbWrap, { marginRight: spacing.sm }]}>
                  <Image source={{ uri }} style={[styles.mediaThumb, { borderRadius: radius.lg }]} />
                  <TouchableOpacity
                    onPress={() => removeMedia(index)}
                    style={[styles.mediaRemoveBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 }]}
                    hitSlop={8}
                  >
                    <Icon name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={addMedia}
                style={[styles.mediaAddBtn, { borderColor: 'rgba(255,255,255,0.3)', borderRadius: radius.lg }]}
                activeOpacity={0.8}
              >
                <Icon name="camera-plus" size={28} color="#9CA3AF" />
                <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Input
          label="Katılımcı Limiti"
          placeholder=""
          value={participantLimit}
          onChangeText={(t) => { setParticipantLimit(t); if (errors.participantLimit) setErrors((e) => ({ ...e, participantLimit: '' })); }}
          leftIcon="account-group"
          leftIconColor={colors.primary}
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          error={errors.participantLimit}
          required
        />
        <Input
          label="Bilet Fiyatı"
          placeholder=""
          value={ticketPrice}
          onChangeText={(t) => { setTicketPrice(t); if (errors.ticketPrice) setErrors((e) => ({ ...e, ticketPrice: '' })); }}
          leftIcon="tag-outline"
          leftIconColor={colors.primary}
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          error={errors.ticketPrice}
          required
        />
        <Button
          title={submitLabel}
          onPress={() => void validateAndPublish()}
          loading={saving}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xxl }}
        />
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  leftIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingHorizontal: 16,
    maxHeight: '85%',
  },
  calendarSection: {
    paddingVertical: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  calendarNav: {
    padding: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  calendarDayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayOther: {
    opacity: 0.6,
  },
  calendarDayDisabled: {
    opacity: 0.5,
  },
  timeCard: {
    marginTop: 8,
    padding: 16,
    maxHeight: 240,
  },
  timeListScroll: {
    maxHeight: 200,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerScroll: {
    minHeight: 280,
    maxHeight: 360,
  },
  pickerScrollContent: {
    paddingBottom: 24,
    paddingVertical: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 52,
  },
  mediaInputBox: {
    borderWidth: 1,
  },
  mediaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaThumbWrap: {
    position: 'relative',
  },
  mediaThumb: {
    width: 88,
    height: 88,
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAddBtn: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

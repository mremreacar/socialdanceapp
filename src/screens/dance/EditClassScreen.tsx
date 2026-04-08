import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, TextInput } from 'react-native';
import { RouteProp, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { LessonDateTimeField } from '../../components/instructor/LessonDateTimeField';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { instructorProfileService, type ExploreInstructorListItem } from '../../services/api/instructorProfile';
import { instructorLessonsService, parseLessonStartsAtToIso, parseTlToCents } from '../../services/api/instructorLessons';
import { getSchoolById, listSchools, type SchoolRow } from '../../services/api/schools';
import { instructorSchoolAssignmentsService, type AssignedSchoolItem } from '../../services/api/instructorSchoolAssignments';
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
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false });
    } else if (dayIndex > daysInMonth) {
      const d = new Date(year, month + 1, dayIndex - daysInMonth);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false });
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
  for (let w = 0; w < days.length; w += 7) weeks.push(days.slice(w, w + 7));
  return weeks;
}

function getTimeOptions(): { date: Date; label: string }[] {
  const options: { date: Date; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const d = new Date(2000, 0, 1, h, m, 0, 0);
      options.push({ date: d, label: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}` });
    }
  }
  return options;
}

const TIME_OPTIONS = getTimeOptions();
const LEVELS = ['Başlangıç', 'Orta', 'İleri'];
const LESSON_FORMAT_OPTIONS = ['Özel ders', 'Grup dersi'] as const;
const LESSON_DELIVERY_OPTIONS = ['Online', 'Yüz yüze'] as const;
const LESSON_CURRENCIES = [
  { code: 'TRY', label: 'TL' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
] as const;

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type Nav = NativeStackNavigationProp<MainStackParamList>;
type EditClassRoute = RouteProp<MainStackParamList, 'EditClass'>;

export const EditClassScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<EditClassRoute>();
  const { colors, spacing, typography, radius, borders } = useTheme();
  const { catalog, compactBySubId } = useDanceCatalog();
  const preselectedSchoolId = route.params?.preselectedSchoolId ?? null;
  const preselectedSchoolName = route.params?.preselectedSchoolName?.trim() || null;
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasInstructorProfile, setHasInstructorProfile] = useState(false);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [assignedSchools, setAssignedSchools] = useState<AssignedSchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(preselectedSchoolId);
  const [preselectedSchool, setPreselectedSchool] = useState<SchoolRow | null>(
    preselectedSchoolId && preselectedSchoolName
      ? {
          id: preselectedSchoolId,
          name: preselectedSchoolName,
          category: null,
          address: null,
          city: null,
          district: null,
          latitude: null,
          longitude: null,
          rating: null,
          review_count: null,
          website: null,
          telephone: null,
          image_url: null,
          current_status: null,
          next_status: null,
          snippet: null,
        }
      : null,
  );
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [eventDateTime, setEventDateTime] = useState<Date | null>(null);
  const [lessonEndsAt, setLessonEndsAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedDanceType, setSelectedDanceType] = useState<string | null>(null);
  const [showDancePicker, setShowDancePicker] = useState(false);
  const [danceSearchQuery, setDanceSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [lessonFormat, setLessonFormat] = useState<(typeof LESSON_FORMAT_OPTIONS)[number]>('Grup dersi');
  const [lessonDelivery, setLessonDelivery] = useState<(typeof LESSON_DELIVERY_OPTIONS)[number]>('Yüz yüze');
  const [currency, setCurrency] = useState<string>('TRY');
  const [availableInstructors, setAvailableInstructors] = useState<ExploreInstructorListItem[]>([]);
  const [showInstructorPicker, setShowInstructorPicker] = useState(false);
  const [instructorSearchQuery, setInstructorSearchQuery] = useState('');
  const [className, setClassName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [participantLimit, setParticipantLimit] = useState('');
  const [fee, setFee] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const timeListRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedSchoolId) ?? null,
    [schools, selectedSchoolId],
  );
  const availableSchools = useMemo(() => {
    if (!preselectedSchool) return schools;
    if (schools.some((school) => school.id === preselectedSchool.id)) return schools;
    return [preselectedSchool, ...schools];
  }, [preselectedSchool, schools]);
  const visibleSelectedSchool = useMemo(() => {
    if (selectedSchool) return selectedSchool;
    if (preselectedSchool && preselectedSchool.id === selectedSchoolId) return preselectedSchool;
    return null;
  }, [preselectedSchool, selectedSchool, selectedSchoolId]);
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
  const selectedDanceTypeLabel = selectedDanceType ? compactBySubId.get(selectedDanceType) ?? '' : '';
  const filteredDanceSections = useMemo(() => {
    const query = danceSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return danceSections;
    return danceSections
      .map((section) => {
        const categoryMatch = section.categoryName.toLocaleLowerCase('tr-TR').includes(query);
        const options = categoryMatch
          ? section.options
          : section.options.filter((option) => option.name.toLocaleLowerCase('tr-TR').includes(query));
        return { ...section, options };
      })
      .filter((section) => section.options.length > 0);
  }, [danceSearchQuery, danceSections]);
  const filteredInstructors = useMemo(() => {
    const query = instructorSearchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return availableInstructors;
    return availableInstructors.filter((item) => {
      const haystack = [item.displayName, item.headline, item.username]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    });
  }, [availableInstructors, instructorSearchQuery]);

  const loadInstructorAccess = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setHasInstructorProfile(false);
      setCheckingAccess(false);
      return;
    }

    setCheckingAccess(true);
    try {
      const row = await instructorProfileService.getMine();
      setHasInstructorProfile(!!row);
    } catch {
      setHasInstructorProfile(false);
    } finally {
      setCheckingAccess(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInstructorAccess();
    }, [loadInstructorAccess]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await instructorProfileService.listVisibleForExplore();
        if (!cancelled) {
          setAvailableInstructors(rows);
        }
      } catch {
        if (!cancelled) {
          setAvailableInstructors([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSchoolsLoading(true);
      try {
        const rows = await listSchools({ limit: 200 });
        if (!cancelled) {
          setSchools(rows);
          setSelectedSchoolId((prev) => {
            if (preselectedSchoolId && rows.some((row) => row.id === preselectedSchoolId)) return preselectedSchoolId;
            return prev && rows.some((row) => row.id === prev) ? prev : null;
          });
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
          setSelectedSchoolId(preselectedSchoolId);
        }
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preselectedSchoolId]);

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
    if (!preselectedSchoolId) {
      setPreselectedSchool(null);
      return;
    }
    if (schools.some((school) => school.id === preselectedSchoolId)) {
      setPreselectedSchool(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getSchoolById(preselectedSchoolId);
        if (!cancelled) {
          setPreselectedSchool(
            row ??
              (preselectedSchoolName
                ? {
                    id: preselectedSchoolId,
                    name: preselectedSchoolName,
                    category: null,
                    address: null,
                    city: null,
                    district: null,
                    latitude: null,
                    longitude: null,
                    rating: null,
                    review_count: null,
                    website: null,
                    telephone: null,
                    image_url: null,
                    current_status: null,
                    next_status: null,
                    snippet: null,
                  }
                : null),
          );
        }
      } catch {
        if (!cancelled) {
          setPreselectedSchool(
            preselectedSchoolName
              ? {
                  id: preselectedSchoolId,
                  name: preselectedSchoolName,
                  category: null,
                  address: null,
                  city: null,
                  district: null,
                  latitude: null,
                  longitude: null,
                  rating: null,
                  review_count: null,
                  website: null,
                  telephone: null,
                  image_url: null,
                  current_status: null,
                  next_status: null,
                  snippet: null,
                }
              : null,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectedSchoolId, preselectedSchoolName, schools]);

  const validateAndSave = async () => {
    const next: Record<string, string> = {};
    if (!className.trim()) next.className = 'Ders adı zorunludur';
    if (!instructor.trim()) next.instructor = 'Eğitmen zorunludur';
    if (!description.trim()) next.description = 'Açıklama zorunludur';
    if (!eventDateTime) next.dateTime = 'Tarih ve saat seçiniz';
    if (!locationAddress) next.location = 'Konum seçiniz';
    if (!selectedDanceType) next.danceType = 'Dans türü seçiniz';
    if (!selectedLevel) next.level = 'Seviye seçiniz';
    if (!participantLimit.trim()) next.participantLimit = 'Katılımcı limiti zorunludur';
    if (!fee.trim()) next.fee = 'Ücret zorunludur';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setAlertModal({ title: 'Eksik Bilgi', message: 'Lütfen tüm zorunlu alanları doldurun.' });
      return;
    }

    const participantLimitValue =
      lessonFormat === 'Özel ders' ? 1 : Number.parseInt(participantLimit.replace(/[^\d]/g, ''), 10);
    const priceCents = parseTlToCents(fee);

    if (eventDateTime && lessonEndsAt && lessonEndsAt.getTime() <= eventDateTime.getTime()) {
      setAlertModal({ title: 'Eksik Bilgi', message: 'Bitiş tarihi başlangıçtan sonra olmalı.' });
      return;
    }

    if (!Number.isFinite(participantLimitValue) || participantLimitValue <= 0 || !eventDateTime) {
      setAlertModal({ title: 'Eksik Bilgi', message: 'Lütfen ders bilgilerini tekrar kontrol edin.' });
      return;
    }

    setSaving(true);
    try {
      await instructorLessonsService.create({
        title: className,
        description,
        danceTypeIds: selectedDanceType ? [selectedDanceType] : [],
        location: locationAddress,
        address: locationAddress,
        city: visibleSelectedSchool?.city ?? null,
        priceCents,
        participantLimit: participantLimitValue,
        currency,
        level: selectedLevel ?? 'Başlangıç',
        lessonFormat: lessonFormat === 'Özel ders' ? 'private' : 'group',
        lessonDelivery: lessonDelivery === 'Online' ? 'online' : 'in_person',
        isPublished: true,
        schoolId: selectedSchoolId,
        startsAt: parseLessonStartsAtToIso(eventDateTime),
        endsAt: parseLessonStartsAtToIso(lessonEndsAt),
      });
      setAlertModal({ title: 'Ders oluşturuldu', message: 'Ders kaydedildi.' });
    } catch (error) {
      setAlertModal({
        title: 'Ders oluşturulamadı',
        message: error instanceof Error ? error.message : 'Lütfen tekrar deneyin.',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (showDatePicker) {
      const t = setTimeout(() => timeListRef.current?.scrollTo({ y: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [showDatePicker]);

  const openDatePicker = () => {
    const initial = eventDateTime || new Date();
    setTempDate(initial);
    setViewMonth(initial);
    setTempTime(initial);
    setShowDatePicker(true);
  };

  const onSelectDate = (d: Date) => setTempDate(d);
  const canSelectDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dNorm = new Date(day.date);
    dNorm.setHours(0, 0, 0, 0);
    return dNorm.getTime() >= today.getTime();
  };
  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const calendarWeeks = useMemo(() => getCalendarWeeks(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth.getFullYear(), viewMonth.getMonth()]);

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
    return h * 2 + (m === 30 ? 1 : 0);
  }, [tempTime]);

  const addMedia = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean) as string[];
        setMediaUris((prev) => [...prev, ...uris]);
      }
    } catch {}
  };

  const removeMedia = (index: number) => setMediaUris((prev) => prev.filter((_, i) => i !== index));

  useEffect(() => {
    if (lessonDelivery === 'Online' && locationAddress) {
      setLocationAddress(null);
      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: '' }));
      }
    }
  }, [errors.location, lessonDelivery, locationAddress]);

  const openSchoolPicker = () => {
    setSchoolSearchQuery('');
    setShowSchoolPicker(true);
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
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = results?.[0];
      if (addr && typeof addr === 'object') {
        const parts = Object.values(addr).filter((v): v is string => typeof v === 'string' && v.length > 0);
        setLocationAddress(parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } else {
        setLocationAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
      setErrors((e) => ({ ...e, location: '' }));
    } catch {
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
          const shouldGoBack = alertModal?.title === 'Ders oluşturuldu';
          setAlertModal(null);
          if (shouldGoBack) navigation.goBack();
        }}
      />
      <Header
        title="Ders Oluştur"
        showBack
        rightIcon={hasInstructorProfile && !checkingAccess && !saving ? 'check' : undefined}
        onRightPress={hasInstructorProfile && !checkingAccess && !saving ? () => void validateAndSave() : undefined}
      />
      {checkingAccess ? (
        <View style={[styles.centeredState, { padding: spacing.xl }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasInstructorProfile ? (
        <View style={[styles.centeredState, { padding: spacing.lg }]}>
          <View
            style={{
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              padding: spacing.xl,
              width: '100%',
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.06)',
                marginBottom: spacing.md,
              }}
            >
              <Icon name="lock-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Ders oluşturmak için eğitmen paneli gerekli</Text>
            <Text style={[typography.bodySmall, { color: '#9CA3AF', marginTop: spacing.sm }]}>
              Tüm kullanıcılar etkinlik oluşturabilir. Ders oluşturma özelliği yalnızca eğitmen profili olan hesaplarda açıktır.
            </Text>
            <Button
              title="Eğitmen paneline git"
              onPress={() => (navigation as any).navigate('InstructorOnboarding')}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 320 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={{ marginBottom: spacing.lg }}>
            <View style={styles.labelRow}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="school" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Bağlı Okul</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => !schoolsLoading && openSchoolPicker()}
              disabled={schoolsLoading}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
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
              {preselectedSchoolId ? 'Bu ekran atanmış olduğun okul seçili şekilde açıldı. İstersen başka okul da seçebilirsin.' : 'Bir okula bağlı dersler için bu alanı kullanabilirsin.'}
            </Text>
            {assignedSchools.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={[typography.captionBold, { color: colors.primary, marginBottom: spacing.xs }]}>Hızlı seçim</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {assignedSchools.map((school) => {
                    const selected = selectedSchoolId === school.schoolId;
                    return (
                      <TouchableOpacity
                        key={school.schoolId}
                        activeOpacity={0.8}
                        onPress={() => setSelectedSchoolId(school.schoolId)}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: radius.xl,
                          borderWidth: 1,
                          borderColor: selected ? colors.primary : 'rgba(255,255,255,0.12)',
                          backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
                        }}
                      >
                        <Text style={[typography.captionBold, { color: '#FFFFFF' }]} numberOfLines={1}>
                          {school.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
          <Input
            label="Ders adı"
            placeholder=""
            value={className}
            onChangeText={(t) => { setClassName(t); if (errors.className) setErrors((e) => ({ ...e, className: '' })); }}
            leftIcon="domain"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
            error={errors.className}
            required
          />
          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.labelRow}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="account" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Eğitmen</Text>
              <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setInstructorSearchQuery('');
                setShowInstructorPicker(true);
              }}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: errors.instructor ? colors.error : 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: instructor ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {instructor || 'Eğitmen seçin'}
              </Text>
              <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
            {errors.instructor ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.instructor}</Text> : null}
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
            <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>Ders formatı</Text>
            <View style={styles.chipRow}>
              {LESSON_FORMAT_OPTIONS.map((option) => (
                <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                  <Chip
                    label={option}
                    selected={lessonFormat === option}
                    onPress={() => {
                      setLessonFormat(option);
                      if (option === 'Özel ders') {
                        setParticipantLimit('1');
                      } else if (participantLimit.trim() === '1') {
                        setParticipantLimit('');
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>Katılım şekli</Text>
            <View style={styles.chipRow}>
              {LESSON_DELIVERY_OPTIONS.map((option) => (
                <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                  <Chip label={option} selected={lessonDelivery === option} onPress={() => setLessonDelivery(option)} />
                </View>
              ))}
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.labelRow}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="calendar" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Başlangıç Tarihi ve Saati</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openDatePicker}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: errors.dateTime ? colors.error : 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: eventDateTime ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {eventDateTime ? formatEventDateTime(eventDateTime) : ''}
              </Text>
              <Icon name="pencil" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
            {errors.dateTime ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.dateTime}</Text> : null}
          </View>

          <LessonDateTimeField
            label="Bitiş tarihi ve saati"
            helperText="İsteğe bağlı. Dersin biteceği zamanı girin."
            emptyText="Bitiş seçmek için dokunun"
            value={lessonEndsAt}
            onChange={setLessonEndsAt}
          />

          {showDatePicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowDatePicker(false)} />
                <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Tarih ve saat seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={prevMonth} style={styles.calendarNav} hitSlop={8}>
                        <Icon name="chevron-left" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={[typography.h3, { color: '#FFFFFF', fontWeight: '700' }]}>{MONTHS_TR[viewMonth.getMonth()]} {viewMonth.getFullYear()}</Text>
                      <TouchableOpacity onPress={nextMonth} style={styles.calendarNav} hitSlop={8}>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.weekdayRow}>
                      {WEEKDAY_TR.map((wd) => (
                        <Text key={wd} style={[typography.caption, { color: 'rgba(255,255,255,0.6)', flex: 1, textAlign: 'center' }]}>{wd}</Text>
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
                              style={[styles.calendarDay, !cell.isCurrentMonth && styles.calendarDayOther, !selectable && cell.isCurrentMonth && styles.calendarDayDisabled]}
                              onPress={() => selectable && onSelectDate(cell.date)}
                              disabled={!selectable}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.calendarDayInner, selected && { backgroundColor: colors.primary }]}>
                                <Text style={[typography.body, { color: !cell.isCurrentMonth ? 'rgba(255,255,255,0.4)' : '#FFFFFF', fontWeight: cell.isToday && !selected ? '700' : '400' }]}>{cell.day}</Text>
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
                        {tempDate.getDate() === new Date().getDate() && tempDate.getMonth() === new Date().getMonth() && tempDate.getFullYear() === new Date().getFullYear()
                          ? 'Bugün'
                          : `${tempDate.getDate()} ${MONTHS_TR[tempDate.getMonth()]} ${tempDate.getFullYear()}`}
                      </Text>
                    )}
                    <ScrollView ref={timeListRef} style={styles.timeListScroll} contentContainerStyle={styles.pickerScrollContent} showsVerticalScrollIndicator={false}>
                      {TIME_OPTIONS.map((opt, index) => (
                        <TouchableOpacity
                          key={`${opt.label}-${index}`}
                          style={[styles.pickerRow, { backgroundColor: index === selectedTimeIndex ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
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
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                  style={styles.schoolPickerKeyboardWrap}
                  pointerEvents="box-none"
                >
                  <View style={[styles.pickerSheet, styles.schoolPickerSheet, { backgroundColor: '#2d1b2e' }]}>
                    <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                      <TouchableOpacity onPress={() => setShowSchoolPicker(false)} hitSlop={12}>
                        <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                      </TouchableOpacity>
                      <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Okul seçin</Text>
                      <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.schoolSearchWrap}>
                      <Icon name="magnify" size={18} color="#9CA3AF" />
                      <TextInput
                        value={schoolSearchQuery}
                        onChangeText={setSchoolSearchQuery}
                        placeholder="Okul ara"
                        placeholderTextColor="#6B7280"
                        style={[typography.body, styles.schoolSearchInput]}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                      />
                    </View>
                    <ScrollView
                      style={styles.schoolPickerList}
                      contentContainerStyle={{ paddingVertical: 8 }}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      <TouchableOpacity
                        style={[styles.pickerRow, { backgroundColor: selectedSchoolId === null ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                        onPress={() => {
                          setSelectedSchoolId(null);
                          setShowSchoolPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>Bağımsız ders</Text>
                        {selectedSchoolId === null && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                      {filteredSchools.map((school) => (
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
                            <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]} numberOfLines={1}>{school.name}</Text>
                            {!!school.city && (
                              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={1}>
                                {school.city}
                                {school.district ? `, ${school.district}` : ''}
                              </Text>
                            )}
                          </View>
                          {selectedSchoolId === school.id && <Icon name="check" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </Modal>
          )}

          {showInstructorPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowInstructorPicker(false)} />
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                  style={styles.schoolPickerKeyboardWrap}
                  pointerEvents="box-none"
                >
                <View style={[styles.pickerSheet, styles.instructorPickerSheet, { backgroundColor: '#2d1b2e' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowInstructorPicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Eğitmen seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={styles.schoolSearchWrap}>
                    <Icon name="magnify" size={18} color="#9CA3AF" />
                    <TextInput
                      value={instructorSearchQuery}
                      onChangeText={setInstructorSearchQuery}
                      placeholder="Eğitmen ara"
                      placeholderTextColor="#6B7280"
                      style={[typography.body, styles.schoolSearchInput]}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="search"
                    />
                  </View>
                  <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                    {filteredInstructors.map((item) => {
                      const label = item.displayName || item.headline || 'Eğitmen';
                      const selected = instructor === label;
                      return (
                        <TouchableOpacity
                          key={item.userId}
                          style={[styles.pickerRow, { backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                          onPress={() => {
                            setInstructor(label);
                            setErrors((e) => ({ ...e, instructor: '' }));
                            setShowInstructorPicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
                            style={styles.instructorAvatar}
                          />
                          <View style={{ flex: 1, paddingRight: spacing.md }}>
                            <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]} numberOfLines={1}>
                              {label}
                            </Text>
                            {!!item.username && (
                              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]} numberOfLines={1}>
                                @{item.username}
                              </Text>
                            )}
                          </View>
                          {selected ? <Icon name="check" size={20} color={colors.primary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                </KeyboardAvoidingView>
              </View>
            </Modal>
          )}

          {lessonDelivery === 'Yüz yüze' ? (
          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="map-marker" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Konum / Yer</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <Input
              placeholder="Okul adı, mekan adı veya açık adres yazın"
              value={locationAddress ?? ''}
              onChangeText={(text) => {
                const trimmed = text.trim();
                setLocationAddress(trimmed.length > 0 ? text : null);
                if (errors.location) setErrors((e) => ({ ...e, location: '' }));
              }}
              leftIcon="map-marker"
              leftIconColor={colors.primary}
              backgroundColor="transparent"
              borderColor={errors.location ? colors.error : 'rgba(255,255,255,0.12)'}
              style={{ color: '#FFFFFF' }}
              placeholderTextColor="#6B7280"
              containerStyle={{ marginTop: 0 }}
            />
            <View style={[styles.locationActionsRow, { marginTop: spacing.sm }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void pickLocation()}
                disabled={locationLoading}
                style={[
                  styles.locationActionButton,
                  { borderColor: 'rgba(255,255,255,0.2)', opacity: locationLoading ? 0.6 : 1 },
                ]}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="crosshairs-gps" size={16} color={colors.primary} />
                )}
                <Text style={[typography.captionBold, styles.locationActionLabel]}>
                  {locationLoading ? 'Alınıyor...' : 'Konumumdan doldur'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.location ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.location}</Text> : null}
          </View>
          ) : null}

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
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: errors.danceType ? colors.error : 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
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
                  <View style={styles.schoolSearchWrap}>
                    <Icon name="magnify" size={18} color="#9CA3AF" />
                    <TextInput
                      value={danceSearchQuery}
                      onChangeText={setDanceSearchQuery}
                      placeholder="Dans türü ara"
                      placeholderTextColor="#6B7280"
                      style={[typography.body, styles.schoolSearchInput]}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="search"
                    />
                  </View>
                  <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                    {filteredDanceSections.map((section) => (
                      <View key={section.categoryId}>
                        <Text style={[typography.captionBold, { color: colors.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }]}>
                          {section.categoryName}
                        </Text>
                        {section.options.map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={[styles.pickerRow, { backgroundColor: selectedDanceType === option.id ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                            onPress={() => { setSelectedDanceType(option.id); setErrors((e) => ({ ...e, danceType: '' })); setDanceSearchQuery(''); setShowDancePicker(false); }}
                            activeOpacity={0.7}
                          >
                            <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{option.name}</Text>
                            {selectedDanceType === option.id && <Icon name="check" size={20} color={colors.primary} />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
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
                    <TouchableOpacity onPress={() => removeMedia(index)} style={[styles.mediaRemoveBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 }]} hitSlop={8}>
                      <Icon name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={addMedia} style={[styles.mediaAddBtn, { borderColor: 'rgba(255,255,255,0.3)', borderRadius: radius.lg }]} activeOpacity={0.8}>
                  <Icon name="camera-plus" size={28} color="#9CA3AF" />
                  <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="chart-line" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Seviye</Text>
            <Text style={[typography.label, { color: colors.error, marginLeft: 2 }]}>*</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowLevelPicker(true)}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: errors.level ? colors.error : 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: selectedLevel ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {selectedLevel || 'Seviye seçin'}
              </Text>
              <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
            {errors.level ? <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>{errors.level}</Text> : null}
          </View>

          {showLevelPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowLevelPicker(false)} />
                <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '40%' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowLevelPicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Seviye seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={{ paddingVertical: 8 }}>
                    {LEVELS.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.pickerRow, { backgroundColor: selectedLevel === name ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                        onPress={() => { setSelectedLevel(name); setErrors((e) => ({ ...e, level: '' })); setShowLevelPicker(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{name}</Text>
                        {selectedLevel === name && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Modal>
          )}

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
          <View style={{ marginTop: spacing.lg }}>
            <Input
              label={`Ücret (${currency})`}
              placeholder=""
              value={fee}
              onChangeText={(t) => { setFee(t); if (errors.fee) setErrors((e) => ({ ...e, fee: '' })); }}
              leftIcon="tag-outline"
              leftIconColor={colors.primary}
              leftIconWithLabel
              labelColor="#9CA3AF"
              backgroundColor="transparent"
              borderColor="rgba(255,255,255,0.12)"
              containerStyle={{ marginTop: 0 }}
              style={{ color: '#FFFFFF' }}
              placeholderTextColor="#6B7280"
              onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              error={errors.fee}
              required
            />
            <View style={{ marginTop: spacing.sm }}>
              <View style={styles.chipRow}>
                {LESSON_CURRENCIES.map((option) => (
                  <View key={option.code} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={option.label} selected={currency === option.code} onPress={() => setCurrency(option.code)} />
                  </View>
                ))}
              </View>
            </View>
          </View>
          <Button title="Kaydet" onPress={() => void validateAndSave()} loading={saving} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateInputRow: { flexDirection: 'row', alignItems: 'center', height: 52 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  leftIconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34, paddingHorizontal: 16, maxHeight: '85%' },
  calendarSection: { paddingVertical: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  calendarNav: { padding: 4 },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeek: { flexDirection: 'row', marginBottom: 4 },
  calendarDay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  calendarDayInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calendarDayOther: { opacity: 0.6 },
  calendarDayDisabled: { opacity: 0.5 },
  timeCard: { marginTop: 8, padding: 16, maxHeight: 240 },
  timeListScroll: { maxHeight: 200 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pickerScrollContent: { paddingBottom: 24, paddingVertical: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, minHeight: 52 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  mediaInputBox: { borderWidth: 1 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: { width: 88, height: 88 },
  mediaRemoveBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  mediaAddBtn: { width: 88, height: 88, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  schoolSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginHorizontal: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  schoolPickerKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  schoolPickerSheet: {
    height: '78%',
  },
  instructorPickerSheet: {
    height: '60%',
  },
  schoolPickerList: {
    flex: 1,
  },
  schoolSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  locationActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  locationActionLabel: {
    color: '#FFFFFF',
    marginLeft: 6,
  },
  instructorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

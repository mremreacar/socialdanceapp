import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { LessonDateTimeField } from '../../components/instructor/LessonDateTimeField';
import { TURKEY_CITIES } from '../../constants/turkeyCities';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import {
  schoolEventAttendeesService,
  type EventAttendee,
} from '../../services/api/schoolEventAttendees';
import {
  formatLessonPrice,
  formatLessonStartsAt,
  instructorLessonsService,
  instructorScheduleService,
  InstructorLessonModel,
  InstructorScheduleSlotModel,
  lessonStartsAtToDate,
  parseLessonStartsAtToIso,
  parseTlToCents,
} from '../../services/api/instructorLessons';
import {
  INSTRUCTOR_WEEKDAYS,
  instructorLocationLabel,
  instructorWeekdayLabel,
} from './instructorScheduleConstants';

const LEVELS = ['Tüm Seviyeler', 'Başlangıç', 'Orta', 'İleri'] as const;
const LESSON_FORMAT_OPTIONS = ['Özel ders', 'Grup dersi'] as const;
const LESSON_DELIVERY_OPTIONS = ['Online', 'Yüz yüze'] as const;
const LESSON_CURRENCIES = [
  { code: 'TRY', label: 'TL' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
] as const;

function parseParticipantLimit(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

type PendingScheduleSlot = {
  localId: string;
  weekday: number;
  startTime: string;
  locationType: InstructorScheduleSlotModel['locationType'];
  address: string | null;
};

export const InstructorLessonsTab: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const { catalog, loading: catalogLoading, error: catalogError, reload: reloadCatalog, compactBySubId } = useDanceCatalog();
  const [lessons, setLessons] = useState<InstructorLessonModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstructorLessonModel | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [lessonLocation, setLessonLocation] = useState('');
  const [lessonAddress, setLessonAddress] = useState('');
  const [lessonCity, setLessonCity] = useState('');
  const [cityListOpen, setCityListOpen] = useState(false);
  const [selectedDanceTypeIds, setSelectedDanceTypeIds] = useState<string[]>([]);
  const [danceListOpen, setDanceListOpen] = useState(false);
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [priceText, setPriceText] = useState('');
  const [currency, setCurrency] = useState<string>('TRY');
  const [participantLimitText, setParticipantLimitText] = useState('');
  const [lessonFormat, setLessonFormat] = useState<(typeof LESSON_FORMAT_OPTIONS)[number]>('Grup dersi');
  const [lessonDelivery, setLessonDelivery] = useState<(typeof LESSON_DELIVERY_OPTIONS)[number]>('Yüz yüze');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructorLessonModel | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lessonStartsAt, setLessonStartsAt] = useState<Date | null>(null);
  const [lessonEndsAt, setLessonEndsAt] = useState<Date | null>(null);
  const [programWeekday, setProgramWeekday] = useState(0);
  const [programStartTime, setProgramStartTime] = useState('19:00');
  const [programAddress, setProgramAddress] = useState('');
  const [pendingSlots, setPendingSlots] = useState<PendingScheduleSlot[]>([]);
  const [modalSlots, setModalSlots] = useState<InstructorScheduleSlotModel[]>([]);
  const [loadingModalSlots, setLoadingModalSlots] = useState(false);
  const [programAdding, setProgramAdding] = useState(false);
  const [detailLesson, setDetailLesson] = useState<InstructorLessonModel | null>(null);
  const [detailSlots, setDetailSlots] = useState<InstructorScheduleSlotModel[]>([]);
  const [loadingDetailSlots, setLoadingDetailSlots] = useState(false);
  const [detailLoadError, setDetailLoadError] = useState<string | null>(null);
  const [attendeeCountByLessonId, setAttendeeCountByLessonId] = useState<Record<string, number>>({});
  const [attendeesLesson, setAttendeesLesson] = useState<InstructorLessonModel | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const resetProgramForm = useCallback(() => {
    setProgramWeekday(0);
    setProgramStartTime('19:00');
    setProgramAddress('');
  }, []);
  const programLocationType: InstructorScheduleSlotModel['locationType'] =
    lessonDelivery === 'Online' ? 'online' : 'in_person';

  useEffect(() => {
    if (lessonDelivery === 'Online') {
      if (programAddress.trim()) {
        setProgramAddress('');
      }
    }
  }, [lessonDelivery, programAddress]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorLessonsService.listMine();
      setLessons(list);
      const countEntries = await Promise.all(
        list.map(async (lesson) => {
          try {
            const rows = await schoolEventAttendeesService.list(lesson.id);
            return [lesson.id, rows.length] as const;
          } catch {
            return [lesson.id, 0] as const;
          }
        }),
      );
      setAttendeeCountByLessonId(Object.fromEntries(countEntries));
    } catch (e: unknown) {
      setLessons([]);
      setAttendeeCountByLessonId({});
      setErrorBanner(e instanceof Error ? e.message : 'Dersler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!modalOpen || !editing) {
      setModalSlots([]);
      setLoadingModalSlots(false);
      return;
    }
    let cancelled = false;
    setLoadingModalSlots(true);
    void instructorScheduleService
      .listByLesson(editing.id)
      .then((list) => {
        if (!cancelled) setModalSlots(list);
      })
      .catch(() => {
        if (!cancelled) setModalSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingModalSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, editing?.id]);

  useEffect(() => {
    if (!detailLesson) {
      setDetailSlots([]);
      setLoadingDetailSlots(false);
      setDetailLoadError(null);
      return;
    }
    let cancelled = false;
    setDetailLoadError(null);
    setLoadingDetailSlots(true);
    void instructorScheduleService
      .listByLesson(detailLesson.id)
      .then((list) => {
        if (!cancelled) setDetailSlots(list);
      })
      .catch(() => {
        if (!cancelled) {
          setDetailSlots([]);
          setDetailLoadError('Program yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailLesson?.id]);

  const openDetail = (lesson: InstructorLessonModel) => {
    setDetailLesson(lesson);
  };

  const closeDetail = () => {
    setDetailLesson(null);
  };

  const openAttendees = async (lesson: InstructorLessonModel) => {
    setAttendeesLesson(lesson);
    setAttendees([]);
    setLoadingAttendees(true);
    try {
      const list = await schoolEventAttendeesService.list(lesson.id);
      setAttendees(list);
      setAttendeeCountByLessonId((prev) => ({ ...prev, [lesson.id]: list.length }));
    } catch (e: unknown) {
      setAttendees([]);
      setErrorBanner(e instanceof Error ? e.message : 'Katılımcılar yüklenemedi.');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const closeAttendees = () => {
    setAttendeesLesson(null);
    setAttendees([]);
    setLoadingAttendees(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCoverImageUri(null);
    setLessonLocation('');
    setLessonAddress('');
    setLessonCity('');
    setCityListOpen(false);
    setSelectedDanceTypeIds([]);
    setDanceListOpen(false);
    setLevel(LEVELS[0]);
    setPriceText('');
    setCurrency('TRY');
    setParticipantLimitText('');
    setLessonFormat('Grup dersi');
    setLessonDelivery('Yüz yüze');
    setIsPublished(true);
    setLessonStartsAt(null);
    setLessonEndsAt(null);
    setPendingSlots([]);
    resetProgramForm();
    setErrorBanner(null);
    setModalOpen(true);
  };

  const openEdit = (lesson: InstructorLessonModel) => {
    setEditing(lesson);
    setTitle(lesson.title);
    setDescription(lesson.description);
    setCoverImageUri(lesson.imageUrl);
    setLessonLocation(lesson.location ?? '');
    setLessonAddress(lesson.address ?? '');
    setLessonCity(lesson.city ?? '');
    setCityListOpen(false);
    setSelectedDanceTypeIds(lesson.danceTypeIds ?? []);
    setDanceListOpen(false);
    setLevel(lesson.level || LEVELS[0]);
    setPriceText(
      lesson.priceCents != null && lesson.priceCents > 0 ? String(lesson.priceCents / 100) : '',
    );
    setCurrency(lesson.currency || 'TRY');
    setParticipantLimitText(
      lesson.participantLimit != null && lesson.participantLimit > 0 ? String(lesson.participantLimit) : '',
    );
    setLessonFormat(lesson.lessonFormat === 'private' ? 'Özel ders' : 'Grup dersi');
    setLessonDelivery(lesson.lessonDelivery === 'online' ? 'Online' : 'Yüz yüze');
    setIsPublished(lesson.isPublished);
    setLessonStartsAt(lessonStartsAtToDate(lesson.startsAt));
    setLessonEndsAt(lessonStartsAtToDate(lesson.endsAt));
    setPendingSlots([]);
    resetProgramForm();
    setErrorBanner(null);
    setModalOpen(true);
  };

  const openEditFromDetail = () => {
    if (!detailLesson) return;
    const l = detailLesson;
    setDetailLesson(null);
    openEdit(l);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingSlots([]);
    setCityListOpen(false);
    setDanceListOpen(false);
  };

  const pickCoverImage = async () => {
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
        setErrorBanner('Kapak fotoğrafı için galeri izni gerekli.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCoverImageUri(result.assets[0].uri);
      }
    } catch {
      setErrorBanner('Kapak fotoğrafı seçilemedi.');
    }
  };

  const onAddProgramRow = async () => {
    if (editing) {
      setProgramAdding(true);
      setErrorBanner(null);
      try {
        await instructorScheduleService.createSlot({
          lessonId: editing.id,
          weekday: programWeekday,
          startTime: programStartTime,
          locationType: programLocationType,
          address: programAddress.trim() || null,
        });
        setProgramAddress('');
        const list = await instructorScheduleService.listByLesson(editing.id);
        setModalSlots(list);
      } catch (e: unknown) {
        setErrorBanner(e instanceof Error ? e.message : 'Program satırı eklenemedi.');
      } finally {
        setProgramAdding(false);
      }
      return;
    }
    setPendingSlots((prev) => [
      ...prev,
      {
        localId: `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        weekday: programWeekday,
        startTime: programStartTime,
        locationType: programLocationType,
        address: programAddress.trim() || null,
      },
    ]);
    setProgramAddress('');
  };

  const removePendingSlot = (localId: string) => {
    setPendingSlots((prev) => prev.filter((p) => p.localId !== localId));
  };

  const danceTypeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((category) => {
      if (category.subcategories.length > 0) {
        category.subcategories.forEach((subcategory) => {
          const label = subcategory.name.trim();
          if (label) map.set(subcategory.id, label);
        });
      } else {
        const label = category.name.trim();
        if (label) map.set(category.id, label);
      }
    });

    selectedDanceTypeIds.forEach((id) => {
      const trimmed = id.trim();
      if (!trimmed || map.has(trimmed)) return;
      map.set(trimmed, compactBySubId.get(trimmed) ?? trimmed);
    });

    return map;
  }, [catalog, compactBySubId, selectedDanceTypeIds]);

  const danceTypeOptions = useMemo(
    (): Array<{ id: string; label: string }> =>
      Array.from(danceTypeLabelById.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'tr', { sensitivity: 'base' })),
    [danceTypeLabelById],
  );

  const selectedDanceLabels = useMemo(
    () => selectedDanceTypeIds.map((id) => danceTypeLabelById.get(id) ?? id).filter(Boolean),
    [danceTypeLabelById, selectedDanceTypeIds],
  );

  const toggleDanceType = (danceTypeId: string) => {
    setSelectedDanceTypeIds((prev) =>
      prev.includes(danceTypeId) ? prev.filter((id) => id !== danceTypeId) : [...prev, danceTypeId],
    );
  };

  const onDeleteModalSlot = async (slot: InstructorScheduleSlotModel) => {
    if (!editing) return;
    try {
      await instructorScheduleService.removeSlot(slot.id);
      const list = await instructorScheduleService.listByLesson(editing.id);
      setModalSlots(list);
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Satır silinemedi.');
    }
  };

  const promptDeleteModalSlot = (slot: InstructorScheduleSlotModel) => {
    Alert.alert(
      'Program satırını sil',
      'Bu haftalık satırı silmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void onDeleteModalSlot(slot);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const onSaveLesson = async () => {
    if (!title.trim()) {
      setErrorBanner('Ders adı gerekli.');
      return;
    }
    if (lessonStartsAt && lessonEndsAt && lessonEndsAt.getTime() <= lessonStartsAt.getTime()) {
      setErrorBanner('Bitiş tarihi başlangıçtan sonra olmalı.');
      return;
    }
    const participantLimit = lessonFormat === 'Özel ders' ? 1 : parseParticipantLimit(participantLimitText);
    const cents = parseTlToCents(priceText);
    setSaving(true);
    setErrorBanner(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        imageUri: coverImageUri,
        danceTypeIds: selectedDanceTypeIds,
        location: lessonLocation.trim() || null,
        address: lessonAddress.trim() || null,
        city: lessonCity.trim() || null,
        priceCents: cents,
        currency,
        participantLimit,
        lessonFormat: lessonFormat === 'Özel ders' ? ('private' as const) : ('group' as const),
        lessonDelivery: lessonDelivery === 'Online' ? ('online' as const) : ('in_person' as const),
        level,
        isPublished,
        startsAt: parseLessonStartsAtToIso(lessonStartsAt),
        endsAt: parseLessonStartsAtToIso(lessonEndsAt),
      };
      if (editing) {
        await instructorLessonsService.update(editing.id, payload);
      } else {
        const created = await instructorLessonsService.create(payload);
        try {
          for (const p of pendingSlots) {
            await instructorScheduleService.createSlot({
              lessonId: created.id,
              weekday: p.weekday,
              startTime: p.startTime,
              locationType: p.locationType,
              address: p.address,
            });
          }
        } catch (slotErr: unknown) {
          setErrorBanner(
            slotErr instanceof Error
              ? slotErr.message
              : 'Ders kaydedildi; bazı program satırları eklenemedi. Program sekmesinden ekleyebilirsiniz.',
          );
          closeModal();
          await load();
          return;
        }
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await instructorLessonsService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Silinemedi.');
      setDeleteTarget(null);
    }
  };

  if (loading && lessons.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {errorBanner && !modalOpen && !detailLesson ? (
        <Text style={[typography.caption, { color: colors.orange, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          {errorBanner}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Button title="Yeni ders" onPress={openCreate} fullWidth icon="plus" />
        {lessons.length === 0 ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' }]}>
            Henüz ders eklemediniz. Ücret alanını boş bırakırsanız ders ücretsiz görünür.
          </Text>
        ) : null}
        {lessons.map((lesson) => (
          <View
            key={lesson.id}
            style={[
              styles.card,
              {
                marginTop: spacing.md,
                backgroundColor: '#311831',
                borderColor: colors.cardBorder,
                borderRadius: radius.xl,
                padding: spacing.md,
              },
            ]}
          >
            {lesson.imageUrl ? (
              <Image source={{ uri: lesson.imageUrl }} style={[styles.cardCover, { borderRadius: radius.lg, marginBottom: spacing.md }]} />
            ) : null}
            <View style={styles.cardTop}>
              <TouchableOpacity
                style={{ flex: 1, paddingRight: spacing.sm }}
                activeOpacity={0.75}
                onPress={() => openEdit(lesson)}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title} dersini düzenle`}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {lesson.title}
                </Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                {lesson.level} · {formatLessonPrice(lesson)}
                {lesson.participantLimit ? ` · ${lesson.participantLimit} kişi` : ''}
                {typeof attendeeCountByLessonId[lesson.id] === 'number' ? ` · ${attendeeCountByLessonId[lesson.id]} katılımcı` : ''}
                {!lesson.isPublished ? ' · Yayında değil' : ''}
                </Text>
                {formatLessonStartsAt(lesson.startsAt) ? (
                <Text style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>
                  {formatLessonStartsAt(lesson.startsAt)}
                </Text>
                ) : null}
                {lesson.location ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                    {[lesson.location, lesson.city].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {lesson.danceTypeIds.length > 0 ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                    {lesson.danceTypeIds.map((id) => danceTypeLabelById.get(id) ?? id).join(', ')}
                  </Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => openDetail(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Detayı görüntüle"
                >
                  <Icon name="eye-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEdit(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Düzenle"
                >
                  <Icon name="pencil-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteTarget(lesson)}
                  hitSlop={12}
                  style={styles.cardActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Sil"
                >
                  <Icon name="trash-can-outline" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
            {lesson.description ? (
              <TouchableOpacity activeOpacity={0.75} onPress={() => openEdit(lesson)}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]} numberOfLines={3}>
                  {lesson.description}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ marginTop: spacing.md }}>
              <Button
                title={`Katılımcılar (${attendeeCountByLessonId[lesson.id] ?? 0})`}
                onPress={() => void openAttendees(lesson)}
                variant="outline"
                fullWidth
                style={{ borderColor: 'rgba(255,255,255,0.24)' }}
                textStyle={{ color: '#FFFFFF', fontSize: 13 }}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <View style={[styles.modalBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderRadius: radius.xl }]}>
            <View style={[styles.modalHeaderRow, { marginBottom: spacing.md }]}>
              <Text style={[typography.h4, { color: '#FFFFFF', flex: 1, paddingRight: spacing.sm }]}>
                {editing ? 'Dersi düzenle' : 'Yeni ders'}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                activeOpacity={0.8}
                style={[
                  styles.modalCloseBtn,
                  {
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
              >
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {errorBanner && modalOpen ? (
              <Text style={[typography.caption, { color: colors.orange, marginBottom: spacing.sm }]}>{errorBanner}</Text>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Ders adı" value={title} onChangeText={setTitle} placeholder="Örn. Bachata partnerwork" />
              <View style={{ height: spacing.md }} />
              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Kapak fotoğrafı</Text>
              {coverImageUri ? (
                <View style={{ marginBottom: spacing.md }}>
                  <Image source={{ uri: coverImageUri }} style={[styles.coverPreview, { borderRadius: radius.lg }]} />
                  <View
                    style={[
                      styles.coverStatusRow,
                      {
                        borderRadius: radius.lg,
                        borderColor: 'rgba(255,255,255,0.12)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        marginTop: spacing.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                      },
                    ]}
                  >
                    <Icon name="check-circle" size={18} color={colors.success} />
                    <Text style={[typography.captionBold, { color: '#FFFFFF', marginLeft: spacing.sm, flex: 1 }]}>
                      Kapak fotoğrafı seçildi
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>Kaydederken yüklenecek</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button title="Değiştir" onPress={() => void pickCoverImage()} variant="outline" style={{ flex: 1, borderColor: 'rgba(255,255,255,0.35)' }} textStyle={{ color: '#FFFFFF' }} />
                    <Button title="Kaldır" onPress={() => setCoverImageUri(null)} variant="ghost" style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => void pickCoverImage()}
                  style={[
                    styles.coverEmptyBox,
                    {
                      borderRadius: radius.lg,
                      borderColor: 'rgba(255,255,255,0.16)',
                      marginBottom: spacing.md,
                      padding: spacing.lg,
                    },
                  ]}
                >
                  <View style={[styles.coverEmptyIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                    <Icon name="image-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.md }]}>
                    Kapak fotoğrafı ekle
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' }]}>
                    Fotoğraf seçtiğinde burada hemen önizleme görünecek.
                  </Text>
                </TouchableOpacity>
              )}
              <LessonDateTimeField
                label="Başlangıç tarihi ve saati"
                helperText="Dersin ne zaman başladığını seçin."
                emptyText="Başlangıç seçmek için dokunun"
                value={lessonStartsAt}
                onChange={setLessonStartsAt}
              />
              <LessonDateTimeField
                label="Bitiş tarihi ve saati"
                helperText="Dersin ne zaman biteceğini seçin."
                emptyText="Bitiş seçmek için dokunun"
                value={lessonEndsAt}
                onChange={setLessonEndsAt}
              />
              <Input
                label="Mekan"
                value={lessonLocation}
                onChangeText={setLessonLocation}
                placeholder="Örn. Kadıköy Dans Stüdyosu"
              />
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Dans türleri
              </Text>
              {catalogLoading ? (
                <View style={styles.centeredInline}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                    Dans türleri yükleniyor…
                  </Text>
                </View>
              ) : catalogError ? (
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={[typography.caption, { color: colors.error }]}>{catalogError}</Text>
                  <TouchableOpacity onPress={reloadCatalog} activeOpacity={0.8} style={{ marginTop: spacing.xs }}>
                    <Text style={[typography.captionBold, { color: colors.primary }]}>Tekrar dene</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setDanceListOpen((prev) => !prev)}
                  activeOpacity={0.85}
                  style={[
                    styles.cityField,
                    {
                      borderRadius: radius.xl,
                      borderColor: colors.inputBorder ?? colors.cardBorder,
                      backgroundColor: '#311831',
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 2 }]}>
                      Dans türleri seç
                    </Text>
                    <Text style={[typography.bodySmall, { color: '#FFFFFF' }]} numberOfLines={2}>
                      {selectedDanceLabels.length ? selectedDanceLabels.join(', ') : 'Dans türü seçin'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {danceListOpen && !catalogLoading && !catalogError ? (
                <View
                  style={[
                    styles.cityList,
                    {
                      borderRadius: radius.lg,
                      borderColor: colors.cardBorder,
                      backgroundColor: '#311831',
                      marginBottom: spacing.sm,
                      padding: spacing.sm,
                    },
                  ]}
                >
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                    {danceTypeOptions.map((option) => {
                      const selected = selectedDanceTypeIds.includes(option.id);
                      return (
                        <TouchableOpacity
                          key={option.id}
                          activeOpacity={0.85}
                          onPress={() => toggleDanceType(option.id)}
                          style={[
                            styles.cityOption,
                            {
                              borderRadius: radius.lg,
                              borderColor: colors.cardBorder,
                              backgroundColor: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
                              marginBottom: spacing.sm,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.md,
                              flexDirection: 'row',
                              alignItems: 'center',
                            },
                          ]}
                        >
                          <Text style={[typography.bodySmall, { color: '#FFFFFF', flex: 1 }]}>{option.label}</Text>
                          <Icon
                            name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                            size={20}
                            color={selected ? colors.primary : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setCityListOpen((prev) => !prev)}
                style={[
                  styles.cityField,
                  {
                    borderRadius: radius.lg,
                    borderColor: colors.cardBorder,
                    backgroundColor: '#311831',
                    marginTop: spacing.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: 4 }]}>Şehir</Text>
                  <Text style={[typography.bodySmall, { color: lessonCity ? '#FFFFFF' : colors.textSecondary }]}>
                    {lessonCity || 'Şehir seç'}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {cityListOpen ? (
                <View
                  style={[
                    styles.cityList,
                    {
                      borderRadius: radius.lg,
                      borderColor: colors.cardBorder,
                      backgroundColor: '#311831',
                      marginTop: spacing.sm,
                      padding: spacing.sm,
                    },
                  ]}
                >
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setLessonCity('');
                        setCityListOpen(false);
                      }}
                      style={[
                        styles.cityOption,
                        {
                          borderRadius: radius.lg,
                          borderColor: colors.cardBorder,
                          backgroundColor: !lessonCity ? 'rgba(255,255,255,0.08)' : 'transparent',
                          marginBottom: spacing.sm,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.md,
                        },
                      ]}
                    >
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Seçimi temizle</Text>
                    </TouchableOpacity>
                    {TURKEY_CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        activeOpacity={0.8}
                        onPress={() => {
                          setLessonCity(city);
                          setCityListOpen(false);
                        }}
                        style={[
                          styles.cityOption,
                          {
                            borderRadius: radius.lg,
                            borderColor: colors.cardBorder,
                            backgroundColor: lessonCity === city ? 'rgba(255,255,255,0.08)' : 'transparent',
                            marginBottom: spacing.sm,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.md,
                          },
                        ]}
                      >
                        <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              <Input
                label="Açık adres"
                value={lessonAddress}
                onChangeText={setLessonAddress}
                placeholder="Örn. Osmanağa Mah. Kuşdili Cad. No:12 Kadıköy"
                multiline
              />
              <Input
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                placeholder="İsteğe bağlı"
                multiline
              />
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Seviye
              </Text>
              <View style={styles.chipRow}>
                {LEVELS.map((lv) => (
                  <View key={lv} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={lv} selected={level === lv} onPress={() => setLevel(lv)} />
                  </View>
                ))}
              </View>
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Para birimi
              </Text>
              <View style={styles.chipRow}>
                {LESSON_CURRENCIES.map((option) => (
                  <View key={option.code} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip
                      label={option.label}
                      selected={currency === option.code}
                      onPress={() => setCurrency(option.code)}
                    />
                  </View>
                ))}
              </View>
              <Input
                label={`Ücret (${currency})`}
                value={priceText}
                onChangeText={setPriceText}
                placeholder="Boş = ücretsiz"
                keyboardType="decimal-pad"
              />
              <Input
                label="Katılımcı sayısı"
                value={participantLimitText}
                onChangeText={setParticipantLimitText}
                placeholder="Boş = limitsiz"
                keyboardType="number-pad"
              />
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Ders formatı
              </Text>
              <View style={styles.chipRow}>
                {LESSON_FORMAT_OPTIONS.map((option) => (
                  <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip
                      label={option}
                      selected={lessonFormat === option}
                      onPress={() => {
                        setLessonFormat(option);
                        if (option === 'Özel ders') {
                          setParticipantLimitText('1');
                        } else if (participantLimitText.trim() === '1') {
                          setParticipantLimitText('');
                        }
                      }}
                    />
                  </View>
                ))}
              </View>
              <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Katılım şekli
              </Text>
              <View style={styles.chipRow}>
                {LESSON_DELIVERY_OPTIONS.map((option) => (
                  <View key={option} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip
                      label={option}
                      selected={lessonDelivery === option}
                      onPress={() => setLessonDelivery(option)}
                    />
                  </View>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.lg,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  backgroundColor: '#311831',
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Yayında</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                    Kapalıysa yalnızca siz görürsünüz.
                  </Text>
                </View>
                <Toggle value={isPublished} onValueChange={setIsPublished} />
              </View>

              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.xs }]}>
                Haftalık program
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                {editing
                  ? 'Bu derse tekrarlayan gün ve saat ekleyin; kayıt anında sunucuya yazılır.'
                  : 'Kaydetmeden önce listeye ekleyin; ders oluşturulunca birlikte kaydedilir.'}
              </Text>

              <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Gün</Text>
              <View style={styles.chipRow}>
                {INSTRUCTOR_WEEKDAYS.map((d) => (
                  <View key={d.v} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                    <Chip label={d.label} selected={programWeekday === d.v} onPress={() => setProgramWeekday(d.v)} />
                  </View>
                ))}
              </View>

              <Input label="Saat" value={programStartTime} onChangeText={setProgramStartTime} placeholder="19:00" />

              {lessonDelivery === 'Yüz yüze' && (
                <Input
                  label="Adres / not"
                  value={programAddress}
                  onChangeText={setProgramAddress}
                  placeholder="İsteğe bağlı"
                  multiline
                />
              )}

              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Program satırı ekle"
                  onPress={() => void onAddProgramRow()}
                  loading={programAdding}
                  fullWidth
                />
              </View>

              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                {editing ? 'Bu derse ait satırlar' : 'Eklenecek satırlar'}
              </Text>
              {editing && loadingModalSlots ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
              ) : editing && modalSlots.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz program satırı yok.</Text>
              ) : editing ? (
                modalSlots.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.slotRow,
                      {
                        marginTop: spacing.sm,
                        padding: spacing.md,
                        backgroundColor: '#311831',
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                        {instructorWeekdayLabel(s.weekday)} {s.startTime}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                        {instructorLocationLabel(s.locationType)}
                        {s.address ? ` · ${s.address}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => promptDeleteModalSlot(s)} hitSlop={12}>
                      <Icon name="trash-can-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : pendingSlots.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz satır eklemediniz.</Text>
              ) : (
                pendingSlots.map((p) => (
                  <View
                    key={p.localId}
                    style={[
                      styles.slotRow,
                      {
                        marginTop: spacing.sm,
                        padding: spacing.md,
                        backgroundColor: '#311831',
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                        {instructorWeekdayLabel(p.weekday)} {p.startTime}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                        {instructorLocationLabel(p.locationType)}
                        {p.address ? ` · ${p.address}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removePendingSlot(p.localId)} hitSlop={12}>
                      <Icon name="trash-can-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
                <Button
                  title="İptal"
                  onPress={closeModal}
                  variant="outline"
                  style={{ flex: 1, borderColor: 'rgba(255,255,255,0.35)' }}
                  textStyle={{ color: '#FFFFFF' }}
                />
                <Button
                  title={editing ? 'Güncelle' : 'Kaydet'}
                  onPress={() => void onSaveLesson()}
                  loading={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!detailLesson} animationType="slide" transparent onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDetail} />
          <View style={[styles.modalBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderRadius: radius.xl }]}>
            {detailLesson ? (
              <>
                <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>Ders detayı</Text>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {detailLesson.imageUrl ? (
                    <Image source={{ uri: detailLesson.imageUrl }} style={[styles.coverPreview, { borderRadius: radius.lg, marginBottom: spacing.md }]} />
                  ) : null}
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{detailLesson.title}</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>
                    {detailLesson.level} · {formatLessonPrice(detailLesson)}
                    {!detailLesson.isPublished ? ' · Yayında değil' : ''}
                  </Text>
                  {formatLessonStartsAt(detailLesson.startsAt) ? (
                    <Text style={[typography.caption, { color: colors.primary, marginTop: 6 }]}>
                      {formatLessonStartsAt(detailLesson.startsAt)}
                    </Text>
                  ) : null}
                  {detailLesson.danceTypeIds.length > 0 ? (
                    <>
                      <Text style={[typography.label, { color: colors.textTertiary, marginTop: spacing.lg }]}>
                        Dans türleri
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                        {detailLesson.danceTypeIds.map((id) => danceTypeLabelById.get(id) ?? id).join(', ')}
                      </Text>
                    </>
                  ) : null}

                  <Text style={[typography.label, { color: colors.textTertiary, marginTop: spacing.lg }]}>Açıklama</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {detailLesson.description?.trim() ? detailLesson.description : 'Açıklama eklenmemiş.'}
                  </Text>

                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
                    Haftalık program
                  </Text>
                  {detailLoadError ? (
                    <Text style={[typography.caption, { color: colors.orange }]}>{detailLoadError}</Text>
                  ) : loadingDetailSlots ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
                  ) : detailSlots.length === 0 ? (
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz program satırı yok.</Text>
                  ) : (
                    detailSlots.map((s) => (
                      <View
                        key={s.id}
                        style={{
                          marginTop: spacing.sm,
                          padding: spacing.md,
                          backgroundColor: '#311831',
                          borderRadius: radius.lg,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                        }}
                      >
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>
                          {instructorWeekdayLabel(s.weekday)} {s.startTime}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                          {instructorLocationLabel(s.locationType)}
                          {s.address ? ` · ${s.address}` : ''}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm }}>
                    <Button
                      title="Kapat"
                      onPress={closeDetail}
                      variant="outline"
                      style={{ flex: 1, borderColor: 'rgba(255,255,255,0.35)' }}
                      textStyle={{ color: '#FFFFFF' }}
                    />
                    <Button title="Düzenle" onPress={openEditFromDetail} style={{ flex: 1 }} />
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={!!attendeesLesson} animationType="slide" transparent onRequestClose={closeAttendees}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeAttendees} />
          <View style={[styles.modalBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderRadius: radius.xl }]}>
            {attendeesLesson ? (
              <>
                <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Katılımcılar</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
                  {attendeesLesson.title}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {loadingAttendees ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
                  ) : attendees.length === 0 ? (
                    <Text style={[typography.caption, { color: colors.textTertiary }]}>Henüz kayıt olan kullanıcı yok.</Text>
                  ) : (
                    attendees.map((attendee) => (
                      <View
                        key={attendee.id}
                        style={[
                          styles.attendeeRow,
                          {
                            backgroundColor: '#311831',
                            borderRadius: radius.lg,
                            borderWidth: 1,
                            borderColor: colors.cardBorder,
                            padding: spacing.md,
                            marginBottom: spacing.sm,
                          },
                        ]}
                      >
                        <View style={[styles.attendeeAvatar, { backgroundColor: '#4B154B', overflow: 'hidden' }]}>
                          {attendee.avatar ? (
                            <Image source={{ uri: attendee.avatar }} style={{ width: 40, height: 40 }} />
                          ) : (
                            <Icon name="account" size={20} color={colors.primary} />
                          )}
                        </View>
                        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.md, flex: 1 }]}>
                          {attendee.name}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={{ marginTop: spacing.md }}>
                    <Button
                      title="Kapat"
                      onPress={closeAttendees}
                      variant="outline"
                      fullWidth
                      style={{ borderColor: 'rgba(255,255,255,0.35)' }}
                      textStyle={{ color: '#FFFFFF' }}
                    />
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Dersi sil"
        message="Bu ders ve bağlı program satırları silinecek. Emin misiniz?"
        cancelLabel="Vazgeç"
        confirmLabel="Sil"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredInline: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  card: { borderWidth: 1 },
  cardCover: { width: '100%', height: 148, backgroundColor: '#241626' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardActions: { flexDirection: 'row', alignItems: 'flex-start' },
  cardActionBtn: { padding: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  coverPreview: { width: '100%', height: 180, backgroundColor: '#241626' },
  coverStatusRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  coverEmptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  coverEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  cityField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  cityList: { borderWidth: 1 },
  cityOption: {
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalBox: {
    maxHeight: '88%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

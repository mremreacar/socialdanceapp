import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Icon } from '../../components/ui/Icon';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import {
  instructorProfileService,
  InstructorProfileModel,
  InstructorWorkMode,
} from '../../services/api/instructorProfile';
import { instructorMediaService, InstructorMediaItem } from '../../services/api/instructorMedia';
import { InstructorLessonsTab } from './InstructorLessonsTab';
import { InstructorStudentsTab } from './InstructorStudentsTab';
import { InstructorCalendarTab } from './InstructorCalendarTab';

const WORK_OPTIONS: { mode: InstructorWorkMode; label: string; hint: string }[] = [
  { mode: 'individual', label: 'Bireysel', hint: 'Kendi adıma ders veriyorum' },
  { mode: 'school', label: 'Okul / kurum', hint: 'Bir okula veya kuruma bağlıyım' },
  { mode: 'both', label: 'Her ikisi', hint: 'Hem bireysel hem kurumla çalışıyorum' },
];

type InstructorTabId = 'profile' | 'lessons' | 'calendar' | 'students';

const INSTRUCTOR_TABS: { id: InstructorTabId; label: string }[] = [
  { id: 'profile', label: 'Profil' },
  { id: 'lessons', label: 'Dersler' },
  { id: 'calendar', label: 'Takvim' },
  { id: 'students', label: 'Öğrenciler' },
];

function LockedTabBody(props: {
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  radius: ReturnType<typeof useTheme>['radius'];
  onGoProfile: () => void;
}) {
  const { colors, spacing, typography, radius, onGoProfile } = props;
  return (
    <View style={[styles.tabBodyCenter, { padding: spacing.lg }]}>
      <View
        style={{
          backgroundColor: '#311831',
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: spacing.xl,
          alignItems: 'center',
        }}
      >
        <Icon name="lock-outline" size={40} color={colors.textTertiary} />
        <Text style={[typography.bodyBold, { color: '#FFFFFF', marginTop: spacing.md, textAlign: 'center' }]}>
          Önce eğitmen profili oluşturun
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
          Bu bölüme geçmek için Profil sekmesinde bilgilerinizi kaydedin.
        </Text>
        <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <Button title="Profil sekmesine git" onPress={onGoProfile} fullWidth />
        </View>
      </View>
    </View>
  );
}

function MediaSection() {
  const { colors, spacing, typography, radius } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPad = spacing.lg;
  const tileSize = (windowWidth - horizontalPad * 2 - 8 * 2) / 3;

  const [items, setItems] = useState<InstructorMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorMediaItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorMediaService.listMine();
      setItems(list);
    } catch (e: unknown) {
      setItems([]);
      setErrorBanner(e instanceof Error ? e.message : 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openPickerAndUpload = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        setErrorBanner('Galeri bu ortamda kullanılamıyor. Fotoğraflar iznini kontrol edin veya native build deneyin.');
        return;
      }
      try {
        if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorBanner('Fotoğraf eklemek için galeri izni gerekir.');
          return;
        }
        if (!ImagePicker?.launchImageLibraryAsync) return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setUploading(true);
        setErrorBanner(null);
        const created = await instructorMediaService.addFromLocalUri(result.assets[0].uri);
        setItems((prev) => [created, ...prev]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel|User cancelled/i.test(msg)) return;
        setErrorBanner(msg || 'Yükleme başarısız.');
      } finally {
        setUploading(false);
      }
    }, 0);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setRemovingId(deleteTarget.id);
    setErrorBanner(null);
    try {
      await instructorMediaService.remove(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    } catch (e: unknown) {
      setErrorBanner(e instanceof Error ? e.message : 'Silinemedi.');
    } finally {
      setRemovingId(null);
      setDeleteTarget(null);
    }
  };

  const atLimit = items.length >= instructorMediaService.maxItems;
  const mediaRows = useMemo(() => {
    const rows: React.ReactElement[] = [];
    for (let index = 0; index < items.length; index += 3) {
      const rowItems = items.slice(index, index + 3);
      rows.push(
        <View key={`row-${index}`} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {rowItems.map((item) => (
            <View key={item.id} style={{ width: tileSize }}>
              <View
                style={{
                  width: tileSize,
                  height: tileSize,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  backgroundColor: '#311831',
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Image source={{ uri: item.publicUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <TouchableOpacity
                  style={[styles.removeBtn, { backgroundColor: `${colors.background}CC` }]}
                  onPress={() => setDeleteTarget(item)}
                  disabled={removingId === item.id}
                  hitSlop={8}
                >
                  {removingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon name="close" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>,
      );
    }
    return rows;
  }, [colors.background, colors.cardBorder, colors.primary, items, radius.md, removingId, tileSize]);

  if (loading && items.length === 0) {
    return (
      <View style={[styles.centered, { paddingVertical: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Medya</Text>
      <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        Keşfette görünürken profilinizi destekleyecek fotoğraflar ekleyin (en fazla {instructorMediaService.maxItems} adet).
      </Text>

      {errorBanner ? (
        <Text style={[typography.caption, { color: colors.orange, marginBottom: spacing.sm }]}>{errorBanner}</Text>
      ) : null}

      <Button
        title={uploading ? 'Yükleniyor…' : 'Galeriden fotoğraf ekle'}
        onPress={() => void openPickerAndUpload()}
        loading={uploading}
        disabled={uploading || atLimit}
        fullWidth
      />

      {atLimit ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
          Limit doldu. Yeni eklemek için mevcut görsellerden birini silin.
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        {items.length === 0 ? (
          <View
            style={{
              paddingVertical: spacing.xl,
              alignItems: 'center',
              backgroundColor: '#311831',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Icon name="image-multiple-outline" size={40} color={colors.textTertiary} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Henüz fotoğraf yok
            </Text>
          </View>
        ) : (
          <View>{mediaRows}</View>
        )}
      </View>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Fotoğrafı sil"
        message="Bu görsel kalıcı olarak kaldırılır."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </View>
  );
}

export const InstructorOnboardingScreen: React.FC = () => {
  const { colors, spacing, typography, radius } = useTheme();
  const { catalog, loading: catalogLoading, error: catalogError, reload: reloadCatalog, compactBySubId } = useDanceCatalog();
  const [activeTab, setActiveTab] = useState<InstructorTabId>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<InstructorProfileModel | null>(null);
  const [workMode, setWorkMode] = useState<InstructorWorkMode>('individual');
  const [headline, setHeadline] = useState('');
  const [instructorBio, setInstructorBio] = useState('');
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showWorkModePicker, setShowWorkModePicker] = useState(false);
  const profileScrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setExisting(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await instructorProfileService.getMine();
      setExisting(row);
      if (row) {
        setWorkMode(row.workMode);
        setHeadline(row.headline);
        setInstructorBio(row.instructorBio);
        setSpecialtyIds(row.specialtyIds);
        setIsVisible(row.isVisible);
      } else {
        setWorkMode('individual');
        setHeadline('');
        setInstructorBio('');
        setSpecialtyIds([]);
        setIsVisible(true);
      }
    } catch {
      setAlertModal({
        title: 'Yüklenemedi',
        message: 'Eğitmen profili alınamadı. Bağlantınızı kontrol edip tekrar deneyin.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const existingSpecialtyLabelById = useMemo(() => {
    const pairs = new Map<string, string>();
    if (!existing) return pairs;
    existing.specialtyIds.forEach((id, index) => {
      const label = existing.specialties[index]?.trim();
      if (id?.trim() && label) {
        pairs.set(id.trim(), label);
      }
    });
    return pairs;
  }, [existing]);

  const toggleSpecialty = (danceTypeId: string) => {
    setSpecialtyIds((prev) =>
      prev.includes(danceTypeId) ? prev.filter((id) => id !== danceTypeId) : [...prev, danceTypeId],
    );
  };

  const specialtyLabelById = useMemo(() => {
    const map = new Map<string, string>();

    catalog.forEach((category) => {
      if (category.subcategories.length > 0) {
        category.subcategories.forEach((subcategory) => {
          const label = subcategory.name.trim();
          if (label) map.set(subcategory.id, label);
        });
        return;
      }

      const label = category.name.trim();
      if (label) map.set(category.id, label);
    });

    specialtyIds.forEach((id) => {
      const trimmedId = id.trim();
      if (!trimmedId || map.has(trimmedId)) return;
      map.set(trimmedId, existingSpecialtyLabelById.get(trimmedId) ?? compactBySubId.get(trimmedId) ?? trimmedId);
    });

    return map;
  }, [catalog, compactBySubId, existingSpecialtyLabelById, specialtyIds]);

  const specialtyOptions = useMemo(
    () =>
      Array.from(specialtyLabelById.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'tr', { sensitivity: 'base' })),
    [specialtyLabelById],
  );

  const selectedSpecialtyLabels = useMemo(
    () => specialtyIds.map((id) => specialtyLabelById.get(id) ?? id).filter(Boolean),
    [specialtyIds, specialtyLabelById],
  );

  const selectedWorkModeLabel = useMemo(
    () => WORK_OPTIONS.find((option) => option.mode === workMode)?.label ?? 'Çalışma şekli seçin',
    [workMode],
  );

  const onSave = async () => {
    if (!hasSupabaseConfig()) {
      setAlertModal({
        title: 'Yapılandırma eksik',
        message: 'Supabase ortam değişkenleri tanımlı değil. Profil kaydedilemiyor.',
      });
      return;
    }
    if (!headline.trim()) {
      setAlertModal({ title: 'Eksik bilgi', message: 'Kısa bir başlık (ör. uzmanlık veya rol) girin.' });
      return;
    }
    setSaving(true);
    try {
      const wasNew = !existing;
      const updated = await instructorProfileService.upsertMine({
        workMode,
        headline,
        instructorBio,
        specialtyIds,
        isVisible,
      });
      setExisting(updated);
      setAlertModal({
        title: 'Kaydedildi',
        message: wasNew
          ? 'Eğitmen profiliniz oluşturuldu. Diğer sekmelerden ders ve takvim üzerinden devam edebilirsiniz.'
          : 'Eğitmen profiliniz güncellendi.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kayıt sırasında bir hata oluştu.';
      setAlertModal({ title: 'Hata', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const hasProfile = !!existing;
  const headerTitle = hasProfile ? 'Eğitmen paneli' : 'Eğitmenliğe başla';

  const renderTabContent = () => {
    if (activeTab === 'profile') {
      return (
        <ScrollView
          ref={profileScrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Keşfette görünecek bilgiler ve çalışma şekliniz. Kaydettikten sonra diğer sekmeleri kullanabilirsiniz.
          </Text>

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Çalışma şekli</Text>
          <TouchableOpacity
            onPress={() => setShowWorkModePicker(true)}
            activeOpacity={0.85}
            style={[
              styles.selectBox,
              {
                backgroundColor: '#311831',
                borderRadius: radius.xl,
                borderColor: colors.inputBorder,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 2 }]}>Çalışma şekli seç</Text>
              <Text style={[typography.bodySmall, { color: '#FFFFFF' }]} numberOfLines={1}>
                {selectedWorkModeLabel}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Modal
            visible={showWorkModePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowWorkModePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                activeOpacity={1}
                style={StyleSheet.absoluteFill}
                onPress={() => setShowWorkModePicker(false)}
              />
              <View
                style={[
                  styles.pickerSheet,
                  {
                    backgroundColor: '#1B1022',
                    borderRadius: radius.xl,
                    borderColor: colors.cardBorder,
                    padding: spacing.lg,
                  },
                ]}
              >
                <View style={styles.pickerHeader}>
                  <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Çalışma şekli seçin</Text>
                  <TouchableOpacity onPress={() => setShowWorkModePicker(false)} hitSlop={12}>
                    <Icon name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  {WORK_OPTIONS.map((opt) => {
                    const selected = workMode === opt.mode;
                    return (
                      <TouchableOpacity
                        key={opt.mode}
                        activeOpacity={0.85}
                        onPress={() => {
                          setWorkMode(opt.mode);
                          setShowWorkModePicker(false);
                        }}
                        style={[
                          styles.pickerRow,
                          {
                            backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
                            borderBottomColor: 'rgba(255,255,255,0.08)',
                            paddingVertical: spacing.md,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, paddingRight: spacing.md }}>
                          <Text style={[typography.bodySmall, { color: '#FFFFFF' }]}>{opt.label}</Text>
                          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>{opt.hint}</Text>
                        </View>
                        <Icon
                          name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                          size={20}
                          color={selected ? colors.primary : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={{ marginTop: spacing.md }}>
                  <Button title="Tamam" onPress={() => setShowWorkModePicker(false)} fullWidth />
                </View>
              </View>
            </View>
          </Modal>

          <Input label="Kısa başlık" value={headline} onChangeText={setHeadline} placeholder="Örn. Bachata & salsa eğitmeni" />
          <View style={{ height: spacing.md }} />
          <Input
            label="Eğitmen hakkında"
            value={instructorBio}
            onChangeText={setInstructorBio}
            placeholder="Deneyim, stil, dille ilgili notlar..."
            multiline
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>Branşlar</Text>
          {catalogLoading ? (
            <View style={[styles.centerRow, { marginTop: spacing.xs, marginBottom: spacing.sm }]}>
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
            <>
              <TouchableOpacity
                onPress={() => setShowSpecialtyPicker(true)}
                activeOpacity={0.85}
                style={[
                  styles.selectBox,
                  {
                    backgroundColor: '#311831',
                    borderRadius: radius.xl,
                    borderColor: colors.inputBorder,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 2 }]}>
                    Dans türleri seç
                  </Text>
                  <Text style={[typography.bodySmall, { color: '#FFFFFF' }]} numberOfLines={2}>
                    {selectedSpecialtyLabels.length ? selectedSpecialtyLabels.join(', ') : 'Branş seçin'}
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <Modal
                visible={showSpecialtyPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSpecialtyPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={() => setShowSpecialtyPicker(false)}
                  />
                  <View
                    style={[
                      styles.pickerSheet,
                      {
                        backgroundColor: '#1B1022',
                        borderRadius: radius.xl,
                        borderColor: colors.cardBorder,
                        padding: spacing.lg,
                      },
                    ]}
                  >
                    <View style={styles.pickerHeader}>
                      <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>Branş seçin</Text>
                      <TouchableOpacity onPress={() => setShowSpecialtyPicker(false)} hitSlop={12}>
                        <Icon name="close" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                      {specialtyOptions.map((option) => {
                        const selected = specialtyIds.includes(option.id);
                        return (
                          <TouchableOpacity
                            key={option.id}
                            activeOpacity={0.85}
                            onPress={() => toggleSpecialty(option.id)}
                            style={[
                              styles.pickerRow,
                              {
                                backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
                                borderBottomColor: 'rgba(255,255,255,0.08)',
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

                    <View style={{ marginTop: spacing.md }}>
                      <Button title="Tamam" onPress={() => setShowSpecialtyPicker(false)} fullWidth />
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              backgroundColor: '#311831',
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Keşfette görünür</Text>
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                Diğer kullanıcılar eğitmen profilinizi Keşfet’te görebilir.
              </Text>
            </View>
            <Toggle value={isVisible} onValueChange={setIsVisible} />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Hızlı erişim</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActiveTab('lessons')}
                style={[
                  styles.quickCard,
                  {
                    flex: 1,
                    backgroundColor: '#311831',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}22` }]}>
                  <Icon name="school-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.sm }]}>Dersler</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Derslerini oluştur ve düzenle.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => profileScrollRef.current?.scrollToEnd({ animated: true })}
                style={[
                  styles.quickCard,
                  {
                    flex: 1,
                    backgroundColor: '#311831',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}22` }]}>
                  <Icon name="image-multiple-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.sm }]}>Medya</Text>
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Fotoğraflarını ve görsellerini yönet.
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <Button title={existing ? 'Profili kaydet' : 'Profili oluştur'} onPress={() => void onSave()} loading={saving} fullWidth />
          </View>

          <MediaSection />
        </ScrollView>
      );
    }

    if (!hasProfile) {
      return (
        <LockedTabBody
          colors={colors}
          spacing={spacing}
          typography={typography}
          radius={radius}
          onGoProfile={() => setActiveTab('profile')}
        />
      );
    }

    if (activeTab === 'lessons') {
      return <InstructorLessonsTab />;
    }
    if (activeTab === 'calendar') {
      return <InstructorCalendarTab />;
    }
    if (activeTab === 'students') {
      return <InstructorStudentsTab />;
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Eğitmen" showBack />
        <View style={[styles.centered, { padding: spacing.xl }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!hasSupabaseConfig()) {
    return (
      <Screen>
        <Header title="Eğitmenliğe başla" showBack />
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            Bu özellik için Supabase yapılandırması gerekir. Geliştirici ortamında EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            değişkenlerini ayarlayın ve veritabanı migration&apos;larını uygulayın.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Header title={headerTitle} showBack />
      <View style={[styles.tabBar, { borderBottomColor: colors.cardBorder, paddingVertical: spacing.xs }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' }}
        >
          {INSTRUCTOR_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.85}
                style={[
                  styles.tabPill,
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    backgroundColor: selected ? `${colors.primary}28` : 'transparent',
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: selected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.tabContent}>{renderTabContent()}</View>

      <ConfirmModal
        visible={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAlertModal(null)}
        onConfirm={() => setAlertModal(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerRow: { flexDirection: 'row', alignItems: 'center' },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  quickCard: {},
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerSheet: {
    borderWidth: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabPill: {
    marginRight: 4,
  },
  tabContent: {
    flex: 1,
  },
  tabBodyCenter: {
    flex: 1,
    justifyContent: 'center',
  },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import type { DanceCategoryWithSubs } from '../../services/api/danceCatalog';

type FilteredSection = {
  categoryId: string;
  categoryName: string;
  options: { id: string; name: string }[];
};

function buildSections(catalog: DanceCategoryWithSubs[]): FilteredSection[] {
  return catalog.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    options:
      c.subcategories.length > 0
        ? c.subcategories.map((s) => ({ id: s.id, name: s.name }))
        : [{ id: c.id, name: c.name }],
  }));
}

function filterSectionsByQuery(sections: FilteredSection[], query: string): FilteredSection[] {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return sections;

  const next: FilteredSection[] = [];
  for (const sec of sections) {
    const catNorm = sec.categoryName.toLocaleLowerCase('tr-TR');
    const catMatch = catNorm.includes(q);
    const options = catMatch ? sec.options : sec.options.filter((o) => o.name.toLocaleLowerCase('tr-TR').includes(q));
    if (options.length > 0) {
      next.push({ ...sec, options });
    }
  }
  return next;
}

type Props = {
  catalog: DanceCategoryWithSubs[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  selectedIds: string[];
  onToggleSubcategory: (subcategoryId: string) => void;
  /** Katalogda olmayan kayıtlı değerler (eski düz metin veya silinmiş stil). */
  orphanValues: string[];
  onRemoveOrphan?: (value: string) => void;
};

export const DanceStylePicker: React.FC<Props> = ({
  catalog,
  loading,
  error,
  onRetry,
  selectedIds,
  onToggleSubcategory,
  orphanValues,
  onRemoveOrphan,
}) => {
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardSpacer = Math.max(0, keyboardHeight - insets.bottom);
  const availableSheetHeight = Math.max(260, windowHeight - keyboardSpacer - insets.top - spacing.xl);
  const sheetMaxHeight = Math.min(Math.round(windowHeight * 0.78), 560, availableSheetHeight);
  const handleApprox = 28;
  const headerApprox = 52;
  const searchBarApprox = 64;
  const scrollMaxHeight = Math.max(160, sheetMaxHeight - handleApprox - headerApprox - searchBarApprox);

  const dismissTranslateY = useMemo(() => Math.min(windowHeight * 0.95, sheetMaxHeight + 80), [windowHeight, sheetMaxHeight]);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    sheetTranslateY.setValue(dismissTranslateY);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 28,
      stiffness: 280,
      mass: 0.85,
    }).start();
  }, [open, dismissTranslateY, sheetTranslateY]);

  useEffect(() => {
    if (!open) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [open]);

  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(sheetTranslateY, {
      toValue: dismissTranslateY,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setKeyboardHeight(0);
        setOpen(false);
        setSearchQuery('');
      }
    });
  };

  const allSections = useMemo(() => buildSections(catalog), [catalog]);
  const filteredSections = useMemo(() => filterSectionsByQuery(allSections, searchQuery), [allSections, searchQuery]);

  const selectedLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of catalog) {
      map.set(c.id, c.name);
      for (const s of c.subcategories) {
        map.set(s.id, `${c.name} · ${s.name}`);
      }
    }
    return map;
  }, [catalog]);

  const selectedLabels = selectedIds
    .map((id) => selectedLabelMap.get(id))
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  if (loading) {
    return (
      <View style={[styles.centerRow, { marginTop: spacing.sm }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.sm }]}>Dans türleri yükleniyor…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ marginTop: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.error }]}>{error}</Text>
        {onRetry ? (
          <TouchableOpacity onPress={onRetry} style={{ marginTop: spacing.sm }} hitSlop={8}>
            <Text style={[typography.captionBold, { color: colors.primary }]}>Tekrar dene</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (!catalog.length) {
    return (
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
        Henüz dans türü tanımlanmamış. Supabase’de `dance_types` tablosuna kök kayıtlar (`parent_id` boş) ve alt türler ekleyin.
      </Text>
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
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
          <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 2 }]}>Dans türü seç</Text>
          <Text style={[typography.bodySmall, { color: '#FFFFFF' }]} numberOfLines={2}>
            {selectedLabels.length ? selectedLabels.join(', ') : 'Kategori ve alt kategori seçin'}
          </Text>
        </View>
        <Icon name="chevron-down" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View pointerEvents="box-none" style={styles.modalSheetWrap}>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  maxHeight: sheetMaxHeight,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                  marginBottom: keyboardSpacer,
                  backgroundColor: '#1B1022',
                  borderTopLeftRadius: radius.xxl,
                  borderTopRightRadius: radius.xxl,
                  transform: [{ translateY: sheetTranslateY }],
                  ...(Platform.OS === 'ios'
                    ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                      }
                    : { elevation: 24 }),
                },
              ]}
            >
              <View style={styles.sheetHandleWrap}>
                <View style={[styles.sheetHandle, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
              </View>

              <View style={[styles.modalHeader, { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm }]}>
                <Text style={[typography.bodyBold, { color: '#FFFFFF', flex: 1, paddingRight: spacing.md }]} numberOfLines={1}>
                  Dans türleri
                </Text>
                <TouchableOpacity onPress={closeModal} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
                  <Icon name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                <View
                  style={[
                    styles.searchField,
                    {
                      backgroundColor: '#311831',
                      borderRadius: radius.lg,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                >
                  <Icon name="magnify" size={20} color="#9CA3AF" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Kategori veya dans türü ara…"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    style={[typography.bodySmall, styles.searchInput, { color: '#FFFFFF' }]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="never"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
                      <Icon name="close-circle" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <ScrollView
                style={{ maxHeight: scrollMaxHeight }}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                showsVerticalScrollIndicator
                bounces
              >
                {filteredSections.length === 0 ? (
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl }]}>
                    “{searchQuery.trim()}” için sonuç yok.
                  </Text>
                ) : (
                  filteredSections.map((section) => (
                    <View key={section.categoryId} style={{ marginBottom: spacing.lg }}>
                      <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
                        {section.categoryName}
                      </Text>
                      {section.options.map((opt) => {
                        const selected = selectedIds.includes(opt.id);
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.optionRow, { paddingRight: spacing.xs }]}
                            onPress={() => onToggleSubcategory(opt.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[typography.bodySmall, { color: '#FFFFFF', flex: 1, paddingRight: spacing.sm }]} numberOfLines={2}>
                              {opt.name}
                            </Text>
                            <Icon
                              name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                              size={22}
                              color={selected ? colors.primary : '#9CA3AF'}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {orphanValues.length > 0 ? (
        <View style={{ marginTop: spacing.xs }}>
          <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
            Kayıtlı (liste dışı)
          </Text>
          <View style={styles.chipGrid}>
            {orphanValues.map((v) => (
              <Chip
                key={v}
                label={v}
                selected
                onPress={() => onRemoveOrphan?.(v)}
                icon="close"
              />
            ))}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Kaldırmak için etikete dokunun.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  selectBox: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheetWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    width: '100%',
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

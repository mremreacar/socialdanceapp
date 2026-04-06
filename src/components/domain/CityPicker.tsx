import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { Icon } from '../ui/Icon';
import { TURKEY_CITIES } from '../../constants/turkeyCities';

type Props = {
  value: string;
  onChange: (city: string) => void;
  label?: string;
  placeholder?: string;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function toDisplayName(value: string): string {
  return value;
}

export const CityPicker: React.FC<Props> = ({
  value,
  onChange,
  label,
  placeholder = 'Şehir seçin',
}) => {
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardSpacer = Math.max(0, keyboardHeight - insets.bottom);
  const availableSheetHeight = Math.max(280, windowHeight - keyboardSpacer - insets.top - spacing.xl);
  const sheetMaxHeight = Math.min(Math.round(windowHeight * 0.78), 560, availableSheetHeight);
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
  }, [dismissTranslateY, open, sheetTranslateY]);

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

  const filteredCities = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    if (!normalizedQuery) return TURKEY_CITIES;
    return TURKEY_CITIES.filter((city) => normalizeText(city).includes(normalizedQuery));
  }, [searchQuery]);

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
        setSearchQuery('');
        setOpen(false);
      }
    });
  };

  const handleSelect = (city: string) => {
    onChange(city);
    closeModal();
  };

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
          {label ? (
            <Text style={[typography.captionBold, { color: colors.textTertiary, marginBottom: 2 }]}>{label}</Text>
          ) : null}
          <Text style={[typography.bodySmall, { color: '#FFFFFF' }]} numberOfLines={1}>
            {value.trim() ? toDisplayName(value) : placeholder}
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
                  Turkiye sehirleri
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
                    placeholder="Şehir ara..."
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
                style={{ maxHeight: Math.max(180, sheetMaxHeight - 144) }}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                showsVerticalScrollIndicator
                bounces
              >
                {filteredCities.length === 0 ? (
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl }]}>
                    "{searchQuery.trim()}" için sonuç yok.
                  </Text>
                ) : (
                  filteredCities.map((city) => {
                    const selected = normalizeText(value) === normalizeText(city);
                    return (
                      <TouchableOpacity
                        key={city}
                        style={styles.optionRow}
                        onPress={() => handleSelect(city)}
                        activeOpacity={0.75}
                      >
                        <Text style={[typography.bodySmall, { color: '#FFFFFF', flex: 1, paddingRight: spacing.sm }]}>{city}</Text>
                        <Icon
                          name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                          size={22}
                          color={selected ? colors.primary : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </Modal>
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
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  TextInput,
  RefreshControl,
  Keyboard,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { DanceStylePicker } from '../../components/domain/DanceStylePicker';
import { CityPicker } from '../../components/domain/CityPicker';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';

function isSupabasePublicAvatarUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri) && uri.includes('/storage/v1/object/public/');
}

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const nameParts = profile.displayName.trim().split(/\s+/);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatarUri);
  const [ad, setAd] = useState(nameParts[0] ?? '');
  const [soyad, setSoyad] = useState(nameParts.slice(1).join(' ') ?? '');
  const [kullaniciAdi, setKullaniciAdi] = useState(profile.username);
  const [hakkimda, setHakkimda] = useState(profile.bio);
  const [email, setEmail] = useState(profile.email);
  const [telefon, setTelefon] = useState('');
  const [sehir, setSehir] = useState(profile.city);
  const [favoriteDances, setFavoriteDances] = useState<string[]>(profile.favoriteDances ?? []);
  const { catalog, loading: catalogLoading, error: catalogError, reload: reloadCatalog, catalogTypeIds } = useDanceCatalog();
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const activeAvatarUri = avatarUri ?? profile.avatarUri;
  const shouldShowAvatarWarning = !!activeAvatarUri && !isSupabasePublicAvatarUrl(activeAvatarUri);
  const scrollRef = useRef<ScrollView | null>(null);
  const fieldLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const focusedField = useRef<string | null>(null);
  const scrollOffsetY = useRef(0);
  const viewportHeight = useRef(0);
  const keyboardSpacer = Platform.OS === 'android' ? keyboardHeight : 0;

  useEffect(() => {
    const parts = profile.displayName.trim().split(/\s+/);
    setAd(parts[0] ?? '');
    setSoyad(parts.slice(1).join(' ') ?? '');
    setKullaniciAdi(profile.username);
    setHakkimda(profile.bio);
    setAvatarUri(profile.avatarUri);
    setEmail(profile.email);
    setSehir(profile.city);
    setFavoriteDances(profile.favoriteDances ?? []);
  }, [profile.displayName, profile.username, profile.bio, profile.avatarUri, profile.email, profile.city, profile.favoriteDances]);

  const scrollToField = useCallback((fieldKey: string | null, keyboardHeightOverride?: number) => {
    if (!fieldKey) return;
    const layout = fieldLayouts.current[fieldKey];
    if (!layout || viewportHeight.current <= 0) return;
    const currentKeyboardHeight = keyboardHeightOverride ?? keyboardHeight;

    const visibleBottom = scrollOffsetY.current + viewportHeight.current - currentKeyboardHeight - spacing.lg;
    const fieldBottom = layout.y + layout.height;
    const targetY = Math.max(0, layout.y - spacing.lg);

    if (layout.y < scrollOffsetY.current + spacing.md) {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
      return;
    }

    if (fieldBottom > visibleBottom) {
      const nextY = Math.max(0, fieldBottom - (viewportHeight.current - currentKeyboardHeight) + spacing.xl);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
    }
  }, [keyboardHeight, spacing.lg, spacing.md, spacing.xl]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom);
      setKeyboardHeight(nextHeight);
      if (focusedField.current) {
        requestAnimationFrame(() => {
          scrollToField(focusedField.current, nextHeight);
        });
      }
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, scrollToField]);

  const captureFieldLayout = useCallback(
    (fieldKey: string) => (event: LayoutChangeEvent) => {
      fieldLayouts.current[fieldKey] = event.nativeEvent.layout;
    },
    [],
  );

  const focusField = useCallback(
    (fieldKey: string) => {
      focusedField.current = fieldKey;
      requestAnimationFrame(() => {
        scrollToField(fieldKey);
      });
    },
    [scrollToField],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeight.current = event.nativeEvent.layout.height;
  }, []);

  const toggleDance = (subcategoryId: string) => {
    setFavoriteDances((prev) =>
      prev.includes(subcategoryId) ? prev.filter((d) => d !== subcategoryId) : [...prev, subcategoryId],
    );
  };

  const removeOrphanDance = (value: string) => {
    setFavoriteDances((prev) => prev.filter((d) => d !== value));
  };

  const orphanDanceValues = favoriteDances.filter((v) => !catalogTypeIds.has(v.trim()));

  const openGalleryAndSetAvatar = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        setAlertModal({
          title: 'Galeri kullanılamıyor',
          message: 'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler bölümünden Fotoğraflar iznini açın. Native build için "npx expo run:ios" veya "npx expo run:android" kullanın.',
        });
        return;
      }
      try {
        if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setAlertModal({
            title: 'Galeri izni gerekli',
            message: 'Profil fotoğrafı için Ayarlar > Bu uygulama > İzinler bölümünden Fotoğraflar iznini verin.',
          });
          return;
        }
        if (!ImagePicker?.launchImageLibraryAsync) return;
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (err: unknown) {
        const message = String(err instanceof Error ? err.message : err);
        if (/cancel|Cancel|User cancelled/i.test(message)) return;
        const isNativeError = /ExponentImagePicker|native module|runtime not ready|not found/i.test(message);
        setAlertModal({
          title: isNativeError ? 'Galeri bu ortamda çalışmıyor' : 'Hata',
          message: isNativeError
            ? 'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler > Fotoğraflar açın. Native build için "npx expo run:ios" veya "npx expo run:android" kullanın.'
            : 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        });
      }
    }, 0);
  };

  const handleSave = async () => {
    if (saving) return;
    const displayName = [ad.trim(), soyad.trim()].filter(Boolean).join(' ') || profile.displayName;
    const username = kullaniciAdi.trim().replace(/^@/, '') || profile.username;
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName || '',
        username: username || '',
        avatarUri,
        bio: hakkimda.trim() || '',
        email: email.trim() || '',
        city: sehir.trim() || '',
        favoriteDances,
      });
      navigation.goBack();
    } catch (e: any) {
      setAlertModal({
        title: 'Profil kaydedilemedi',
        message: e?.message || 'Profil bilgileriniz kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing || saving) return;
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch {
      // ignore; keep current form values
    } finally {
      setRefreshing(false);
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
        onConfirm={() => setAlertModal(null)}
      />
      <Header title="Profili düzenle" showBack />
      <View style={{ flex: 1 }} onLayout={handleViewportLayout}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl + keyboardSpacer + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor="rgba(0,0,0,0.25)"
              progressViewOffset={60}
            />
          }
        >
          <TouchableOpacity
            onPress={openGalleryAndSetAvatar}
            style={[styles.avatarWrap, { borderColor: colors.primary }]}
            activeOpacity={0.9}
          >
            <View style={styles.avatarImageWrap}>
              {avatarUri || profile.avatarUri ? (
                <Image source={{ uri: avatarUri || profile.avatarUri || '' }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#311831' }]}>
                  <Icon name="account" size={42} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View pointerEvents="none" style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Icon name="camera-plus" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          {shouldShowAvatarWarning ? (
            <Text
              style={[
                typography.caption,
                {
                  color: '#F59E0B',
                  textAlign: 'center',
                  marginTop: -spacing.sm,
                  marginBottom: spacing.lg,
                },
              ]}
            >
              Uyarı: Profil fotoğrafınızın güncellenmesi için fotoğrafınızı tekrar seçip Kaydet yapın.
            </Text>
          ) : null}

          <View onLayout={captureFieldLayout('ad')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.xs }]}>Ad</Text>
            <Input
              value={ad}
              onChangeText={setAd}
              onFocus={() => focusField('ad')}
              placeholder="Adınız"
              placeholderTextColor="rgba(255,255,255,0.5)"
              containerStyle={{ marginBottom: spacing.md }}
              backgroundColor="#311831"
              style={{ color: '#FFFFFF' }}
              returnKeyType="next"
            />
          </View>

          <View onLayout={captureFieldLayout('soyad')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Soyad</Text>
            <Input
              value={soyad}
              onChangeText={setSoyad}
              onFocus={() => focusField('soyad')}
              placeholder="Soyadınız"
              placeholderTextColor="rgba(255,255,255,0.5)"
              containerStyle={{ marginBottom: spacing.md }}
              backgroundColor="#311831"
              style={{ color: '#FFFFFF' }}
              returnKeyType="next"
            />
          </View>

          <View onLayout={captureFieldLayout('kullaniciAdi')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Kullanıcı adı</Text>
            <Input
              value={kullaniciAdi}
              onChangeText={setKullaniciAdi}
              onFocus={() => focusField('kullaniciAdi')}
              placeholder="@kullaniciadi"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              containerStyle={{ marginBottom: spacing.md }}
              backgroundColor="#311831"
              style={{ color: '#FFFFFF' }}
              returnKeyType="next"
            />
          </View>

          <View onLayout={captureFieldLayout('hakkimda')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Hakkımda</Text>
            <View style={{ marginBottom: spacing.md }}>
              <TextInput
                value={hakkimda}
                onChangeText={setHakkimda}
                onFocus={() => focusField('hakkimda')}
                placeholder="Kendinizi kısaca tanıtın..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                numberOfLines={3}
                style={[
                  typography.body,
                  {
                    backgroundColor: '#311831',
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    minHeight: 88,
                    color: '#FFFFFF',
                    textAlignVertical: 'top',
                  },
                ]}
              />
            </View>
          </View>

          <View onLayout={captureFieldLayout('email')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>E-posta</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              onFocus={() => focusField('email')}
              placeholder="ornek@email.com"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={{ marginBottom: spacing.md }}
              backgroundColor="#311831"
              style={{ color: '#FFFFFF' }}
              returnKeyType="next"
            />
          </View>

          <View onLayout={captureFieldLayout('telefon')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Telefon</Text>
            <Input
              value={telefon}
              onChangeText={setTelefon}
              onFocus={() => focusField('telefon')}
              placeholder="5XX XXX XX XX"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="phone-pad"
              containerStyle={{ marginBottom: spacing.md }}
              backgroundColor="#311831"
              style={{ color: '#FFFFFF' }}
              returnKeyType="next"
            />
          </View>

          <View onLayout={captureFieldLayout('sehir')}>
            <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Şehir</Text>
            <View style={{ marginBottom: spacing.md }}>
              <CityPicker
                value={sehir}
                onChange={setSehir}
                placeholder="Türkiye'de bir şehir seçin"
              />
            </View>
          </View>

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Favori dans türleri</Text>
          <View style={{ marginBottom: spacing.xl }}>
            <DanceStylePicker
              catalog={catalog}
              loading={catalogLoading}
              error={catalogError}
              onRetry={reloadCatalog}
              selectedIds={favoriteDances}
              onToggleSubcategory={toggleDance}
              orphanValues={orphanDanceValues}
              onRemoveOrphan={removeOrphanDance}
            />
          </View>

          <Button title={saving ? 'Kaydediliyor...' : 'Kaydet'} onPress={handleSave} fullWidth size="lg" disabled={saving} />
        </ScrollView>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 24,
  },
  avatarImageWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
});

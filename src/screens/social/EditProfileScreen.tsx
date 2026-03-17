import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { Chip } from '../../components/ui/Chip';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const { profile, updateProfile } = useProfile();
  const nameParts = profile.displayName.trim().split(/\s+/);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatarUri);
  const [ad, setAd] = useState(nameParts[0] ?? '');
  const [soyad, setSoyad] = useState(nameParts.slice(1).join(' ') ?? '');
  const [kullaniciAdi, setKullaniciAdi] = useState(profile.username);
  const [hakkimda, setHakkimda] = useState(profile.bio);
  const [email, setEmail] = useState(profile.email);
  const [telefon, setTelefon] = useState('');
  const [sehir, setSehir] = useState('İstanbul');
  const [favoriteDances, setFavoriteDances] = useState<string[]>(profile.favoriteDances ?? []);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parts = profile.displayName.trim().split(/\s+/);
    setAd(parts[0] ?? '');
    setSoyad(parts.slice(1).join(' ') ?? '');
    setKullaniciAdi(profile.username);
    setHakkimda(profile.bio);
    setAvatarUri(profile.avatarUri);
    setEmail(profile.email);
    setFavoriteDances(profile.favoriteDances ?? []);
  }, [profile.displayName, profile.username, profile.bio, profile.avatarUri, profile.email, profile.favoriteDances]);

  const DANCES = ['Salsa', 'Bachata', 'Hip-Hop', 'Tango', 'Kizomba', 'Swing', 'Zumba', 'Vals', 'Modern'] as const;

  const toggleDance = (dance: string) => {
    setFavoriteDances((prev) => (prev.includes(dance) ? prev.filter((d) => d !== dance) : [...prev, dance]));
  };

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.xs }]}>Ad</Text>
          <Input
            value={ad}
            onChangeText={setAd}
            placeholder="Adınız"
            placeholderTextColor="rgba(255,255,255,0.5)"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Soyad</Text>
          <Input
            value={soyad}
            onChangeText={setSoyad}
            placeholder="Soyadınız"
            placeholderTextColor="rgba(255,255,255,0.5)"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Kullanıcı adı</Text>
          <Input
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            placeholder="@kullaniciadi"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="none"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Hakkımda</Text>
          <View style={{ marginBottom: spacing.md }}>
            <TextInput
              value={hakkimda}
              onChangeText={setHakkimda}
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

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>E-posta</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Telefon</Text>
          <Input
            value={telefon}
            onChangeText={setTelefon}
            placeholder="5XX XXX XX XX"
            placeholderTextColor="rgba(255,255,255,0.5)"
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Şehir</Text>
          <Input
            value={sehir}
            onChangeText={setSehir}
            placeholder="Şehir"
            placeholderTextColor="rgba(255,255,255,0.5)"
            containerStyle={{ marginBottom: spacing.md }}
            backgroundColor="#311831"
            style={{ color: '#FFFFFF' }}
          />

          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Favori dans türleri</Text>
          <View style={{ marginBottom: spacing.xl }}>
            <View style={[styles.chipGrid, { marginTop: spacing.sm }]}>
              {DANCES.map((dance) => (
                <Chip
                  key={dance}
                  label={dance}
                  selected={favoriteDances.includes(dance)}
                  onPress={() => toggleDance(dance)}
                  icon={favoriteDances.includes(dance) ? 'check' : undefined}
                />
              ))}
            </View>
          </View>

          <Button title={saving ? 'Kaydediliyor...' : 'Kaydet'} onPress={handleSave} fullWidth size="lg" disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

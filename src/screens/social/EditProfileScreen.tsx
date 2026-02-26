import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { getAvatarSource } from '../../context/ProfileContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

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
  const [email, setEmail] = useState('elif@example.com');
  const [telefon, setTelefon] = useState('');
  const [sehir, setSehir] = useState('İstanbul');
  const [favoriDans, setFavoriDans] = useState('Salsa, Bachata');

  useEffect(() => {
    const parts = profile.displayName.trim().split(/\s+/);
    setAd(parts[0] ?? '');
    setSoyad(parts.slice(1).join(' ') ?? '');
    setKullaniciAdi(profile.username);
    setHakkimda(profile.bio);
    setAvatarUri(profile.avatarUri);
  }, [profile.displayName, profile.username, profile.bio, profile.avatarUri]);

  const openGalleryAndSetAvatar = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        Alert.alert(
          'Galeri kullanılamıyor',
          'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler bölümünden Fotoğraflar iznini açın. Native build için "npx expo run:ios" veya "npx expo run:android" kullanın.',
          [{ text: 'Tamam' }]
        );
        return;
      }
      try {
        if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Galeri izni gerekli',
            'Profil fotoğrafı için Ayarlar > Bu uygulama > İzinler bölümünden Fotoğraflar iznini verin.',
            [{ text: 'Tamam' }]
          );
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
        Alert.alert(
          isNativeError ? 'Galeri bu ortamda çalışmıyor' : 'Hata',
          isNativeError
            ? 'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler > Fotoğraflar açın. Native build için "npx expo run:ios" veya "npx expo run:android" kullanın.'
            : 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    }, 0);
  };

  const handleSave = () => {
    const displayName = [ad.trim(), soyad.trim()].filter(Boolean).join(' ') || profile.displayName;
    const username = kullaniciAdi.trim().replace(/^@/, '') || profile.username;
    updateProfile({
      displayName: displayName || 'Elif Yılmaz',
      username: username || 'elifyilmaz',
      avatarUri,
      bio: hakkimda.trim() || profile.bio,
    });
    navigation.goBack();
  };

  return (
    <Screen>
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
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Image source={{ uri: getAvatarSource(profile.avatarUri) }} style={styles.avatarImage} />
              )}
            </View>
            <View pointerEvents="none" style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Icon name="camera-plus" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[typography.label, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs }]}>Ad</Text>
          <Input
            value={ad}
            onChangeText={setAd}
            placeholder="Adınız"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Soyad</Text>
          <Input
            value={soyad}
            onChangeText={setSoyad}
            placeholder="Soyadınız"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Kullanıcı adı</Text>
          <Input
            value={kullaniciAdi}
            onChangeText={setKullaniciAdi}
            placeholder="@kullaniciadi"
            autoCapitalize="none"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Hakkımda</Text>
          <View style={{ marginBottom: spacing.md }}>
            <TextInput
              value={hakkimda}
              onChangeText={setHakkimda}
              placeholder="Kendinizi kısaca tanıtın..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={3}
              style={[
                typography.body,
                {
                  backgroundColor: colors.inputBg,
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  minHeight: 88,
                  color: colors.text,
                  textAlignVertical: 'top',
                },
              ]}
            />
          </View>

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>E-posta</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Telefon</Text>
          <Input
            value={telefon}
            onChangeText={setTelefon}
            placeholder="5XX XXX XX XX"
            keyboardType="phone-pad"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Şehir</Text>
          <Input
            value={sehir}
            onChangeText={setSehir}
            placeholder="Şehir"
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Favori dans türleri</Text>
          <Input
            value={favoriDans}
            onChangeText={setFavoriDans}
            placeholder="Örn: Salsa, Bachata, Tango"
            containerStyle={{ marginBottom: spacing.xl }}
          />

          <Button title="Kaydet" onPress={handleSave} fullWidth size="lg" />
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

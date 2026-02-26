import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { Toggle } from '../../components/ui/Toggle';
import { Chip } from '../../components/ui/Chip';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const Step1Profile: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  const openGalleryAndSetAvatar = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        Alert.alert(
          'Galeri kullanılamıyor',
          'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler bölümünden Fotoğraflar iznini açın. Hâlâ çalışmıyorsa bilgisayarda "npx expo run:ios" veya "npx expo run:android" çalıştırıp uygulamayı yeniden yükleyin.',
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
            'Profil fotoğrafı için Ayarlar > Bu uygulama > İzinler (veya Fotoğraflar) bölümünden izin verin. Expo Go kullanıyorsanız "Expo Go" uygulamasının izinlerine bakın.',
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
        const isNativeError =
          /ExponentImagePicker|native module|runtime not ready|not found/i.test(message);
        Alert.alert(
          isNativeError ? 'Galeri bu ortamda çalışmıyor' : 'Hata',
          isNativeError
            ? 'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler > Fotoğraflar açın. Yoksa bilgisayarda "npx expo run:ios" veya "npx expo run:android" ile uygulamayı derleyip telefona yükleyin; izinler o build\'de görünür.'
            : 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    }, 0);
  };

  return (
    <KeyboardAvoidingView
      style={styles.stepScroll}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContainerScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Profilini Oluştur</Text>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Seni dans pistinde nasıl tanıyalım?</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              onPress={openGalleryAndSetAvatar}
              activeOpacity={0.9}
              style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary, borderColor: colors.background, ...shadows.xl }]}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Icon name="account" size={64} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
            <View style={[styles.cameraButton, { backgroundColor: colors.primary, ...shadows.md }]}>
              <Icon name="camera-plus" size={18} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Input placeholder="Ad" />
          <Input placeholder="Soyad" />
          <Input placeholder="Kullanıcı Adı" autoCapitalize="none" onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })} />
        </View>
      </ScrollView>
      <View style={styles.stepButtonContainer}>
        <Button title="Devam Et" onPress={next} fullWidth iconRight="arrow-right" size="lg" />
      </View>
    </KeyboardAvoidingView>
  );
};

// Konum/bildirim native modülleri Expo Go'da yok; sadece kullanıcı açmak istediğinde dene, açılışta hiç yükleme
const isStandalone = Constants.appOwnership === 'standalone';

const Step2Permissions: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, radius } = useTheme();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // İzin durumunu sadece standalone build'de ve kullanıcı sayfadayken (toggle'a basınca) yüklüyoruz.
  // Açılışta import yok → Expo Go'da "Cannot find native module" hatası oluşmaz.
  const requestLocationPermission = async (enable: boolean) => {
    if (!enable) {
      setLocationEnabled(false);
      return;
    }
    if (!isStandalone) {
      Alert.alert(
        'Expo Go\'da kullanılamaz',
        'Konum izni Expo Go içinde desteklenmiyor. Gerçek izin penceresini kullanmak için: bilgisayarda "npx expo run:ios" veya "npx expo run:android" çalıştırıp uygulamayı cihaza yükleyin.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    setLocationLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
      if (status === 'granted') {
        // İzin verildiği anda konumu gerçekten kullan (mağaza incelemesi için)
        try {
          await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } catch {
          // Konum alınamazsa bile izin kullanılmış sayılır
        }
      } else {
        Alert.alert(
          'Konum izni',
          'Çevrenizdeki etkinlikleri gösterebilmek için konum erişimine izin vermeniz gerekir. İsterseniz ayarlardan sonra açabilirsiniz.',
          [{ text: 'Tamam' }]
        );
      }
    } catch {
      setLocationEnabled(false);
      Alert.alert('Hata', 'Konum izni alınamadı.', [{ text: 'Tamam' }]);
    } finally {
      setLocationLoading(false);
    }
  };

  const requestNotificationPermission = async (enable: boolean) => {
    if (!enable) {
      setNotificationsEnabled(false);
      return;
    }
    if (!isStandalone) {
      Alert.alert(
        'Expo Go\'da kullanılamaz',
        'Bildirim izni Expo Go içinde desteklenmiyor. Gerçek izin penceresini kullanmak için: bilgisayarda "npx expo run:ios" veya "npx expo run:android" çalıştırıp uygulamayı cihaza yükleyin.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    setNotificationsLoading(true);
    try {
      const Notifications = await import('expo-notifications');
      const { status: existing } = await Notifications.getPermissionsAsync();
      const finalStatus =
        existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
      setNotificationsEnabled(finalStatus === 'granted');
      if (finalStatus === 'granted') {
        // İzin verildiği anda bildirimi kullan: hoş geldin bildirimi (mağaza incelemesi için)
        const { scheduleWelcomeNotification } = await import('../../services/notifications');
        scheduleWelcomeNotification().catch(() => {});
      } else {
        Alert.alert(
          'Bildirim izni',
          'Davet ve duyurulardan haberdar olmak için bildirimlere izin vermeniz gerekir. İsterseniz ayarlardan sonra açabilirsiniz.',
          [{ text: 'Tamam' }]
        );
      }
    } catch {
      setNotificationsEnabled(false);
      Alert.alert('Hata', 'Bildirim izni alınamadı.', [{ text: 'Tamam' }]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.permImageContainer}>
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQdBDDsaKfkUft8mhsAYAUDUNQJR1-UZhpQl82VqRFEtR_g66qRzzSwCkGOlOC4FqwGH0I9a6ulbw6q6nu0-75dYiLEUm195N_okb_KJHKemb6MSwQZ1f8dTnAPcbpCmoPExNYabNnRCT1F8K3BqwdBxweQGB7zx4AyHY3NNZv98_cqxq_pmAubKmgd50LR4hpC24aHCf_FpGX9aS4QDlQTNHDh0OmmU6RvtbxnhEK5r2VvB1P2M3AcDFKRZ0vqsljryQMdsE14Ns' }}
          style={[styles.permImage, { borderRadius: radius.xxl }]}
        />
      </View>

      <Text style={[styles.stepTitle, { color: colors.text, textAlign: 'center', marginTop: spacing.xxxl }]}>Deneyimi Tamamla</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
        Sana en uygun etkinlikleri bulmamız ve seni haberdar etmemiz için izin ver.
      </Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
        <View style={[styles.permRow, { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.lg }]}>
          <View style={[styles.permIcon, { backgroundColor: colors.primaryAlpha10 }]}>
            <Icon name="map-marker" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[{ fontWeight: '700', fontSize: 14, color: colors.text }]}>Konum</Text>
            <Text style={[{ fontSize: 12, color: colors.textSecondary }]}>Çevrendeki etkinlikler</Text>
          </View>
          <Toggle
            value={locationEnabled}
            onValueChange={requestLocationPermission}
            disabled={locationLoading}
          />
        </View>

        <View style={[styles.permRow, { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.lg }]}>
          <View style={[styles.permIcon, { backgroundColor: colors.orangeAlpha }]}>
            <Icon name="bell" size={20} color={colors.orange} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[{ fontWeight: '700', fontSize: 14, color: colors.text }]}>Bildirimler</Text>
            <Text style={[{ fontSize: 12, color: colors.textSecondary }]}>Davetler ve duyurular</Text>
          </View>
          <Toggle
            value={notificationsEnabled}
            onValueChange={requestNotificationPermission}
            disabled={notificationsLoading}
          />
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Button title="İzin Ver ve Başla" onPress={next} fullWidth size="lg" />
    </View>
  );
};

const Step3Preferences: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const { colors, spacing } = useTheme();
  const dances = ['Salsa', 'Bachata', 'Hip-Hop', 'Tango', 'Kizomba', 'Swing', 'Zumba', 'Vals', 'Modern'];
  const [selected, setSelected] = useState(['Salsa']);

  const toggle = (dance: string) => {
    if (selected.includes(dance)) setSelected(selected.filter((d) => d !== dance));
    else setSelected([...selected, dance]);
  };

  return (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Hangi danslar seni{' '}
        <Text style={{ color: colors.primary }}>harekete geçirir?</Text>
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Sana en uygun etkinlikleri önerebilmemiz için ilgilendiğin türleri seç.
      </Text>

      <View style={[styles.chipGrid, { marginTop: spacing.xxl }]}>
        {dances.map((dance) => (
          <Chip
            key={dance}
            label={dance}
            selected={selected.includes(dance)}
            onPress={() => toggle(dance)}
            icon={selected.includes(dance) ? 'check' : undefined}
          />
        ))}
      </View>

      <View style={{ marginTop: spacing.xxxl }}>
        <Text style={[{ fontWeight: '700', fontSize: 14, color: colors.text, marginBottom: spacing.sm }]}>Diğer ilgi alanları</Text>
        <Input placeholder="Örn: Bale, Pilates..." leftIcon="pencil" />
      </View>

      <View style={{ flex: 1 }} />
      <Button title="Kaydet ve Başla" onPress={onFinish} fullWidth iconRight="arrow-right" size="lg" />
    </ScrollView>
  );
};

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius } = useTheme();
  const [step, setStep] = useState(1);

  const handleFinish = async () => {
    const { storage } = await import('../../services/storage');
    await storage.setLoggedIn(true);
    (navigation.getParent() as any)?.reset({ index: 0, routes: [{ name: 'App' }] });
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          style={[styles.backBtn, { borderRadius: radius.full }]}
        >
          <Icon name="arrow-left" size={22} color={colors.icon} />
        </TouchableOpacity>

        <View style={styles.dots}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === step ? 32 : 8,
                  backgroundColor: i === step ? colors.primary : colors.primaryAlpha20,
                  borderRadius: radius.full,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleFinish}>
          <Text style={[{ fontSize: 14, fontWeight: '700', color: colors.textTertiary }]}>Atla</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.stepWrapper, { paddingHorizontal: spacing.lg }]}>
        {step === 1 && <Step1Profile next={() => setStep(2)} />}
        {step === 2 && <Step2Permissions next={() => setStep(3)} />}
        {step === 3 && <Step3Preferences onFinish={handleFinish} />}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
  },
  stepWrapper: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepContainerScroll: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepButtonContainer: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    width: 128,
    height: 128,
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permImageContainer: {
    alignItems: 'center',
  },
  permImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

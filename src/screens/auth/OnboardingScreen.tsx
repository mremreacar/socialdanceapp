import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { GoogleColorIcon } from '../../components/ui/GoogleColorIcon';
import { Toggle } from '../../components/ui/Toggle';
import { Chip } from '../../components/ui/Chip';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const IntroStepWelcome: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, typography, shadows } = useTheme();

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: spacing.sm, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0, marginTop: 116 }]}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../../assets/social-dance-logo.png')}
          style={styles.onboardingLogoStandalone}
          resizeMode="contain"
        />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
          Hoş Geldiniz
        </Text>
        <Text
          style={[
            typography.caption,
            {
              fontFamily: 'Poppins_300Light',
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: 0,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Dans etmeyi seven insanları bir araya getiren{'\n'}sosyal dans topluluğuna ilk adımını attın.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxxxl + spacing.xs, width: '100%' }}>
        <Button title="Devam Et" onPress={next} fullWidth size="lg" iconRight="arrow-right" />
      </View>
    </View>
  );
};

const IntroStepAbout: React.FC<{ next: () => void }> = ({ next }) => {
  const { colors, spacing, typography, shadows } = useTheme();

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: spacing.lg, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0, marginTop: 110 }]}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../../assets/social-dance-logo.png')}
          style={styles.onboardingLogoStandalone}
          resizeMode="contain"
        />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
          Dans etmeye hazır mısın?
        </Text>
        <Text
          style={[
            typography.caption,
            {
              fontFamily: 'Poppins_300Light',
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: spacing.sm,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Dans etkinliklerini keşfet, yeni partnerler bul{'\n'}ve toplulukla bağlan. Seni en uygun etkinlikler{'\n'}ve insanlarla bir araya getiriyoruz.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xxxxl + spacing.xs, width: '100%' }}>
        <Button title="Giriş Adımlarına Geç" onPress={next} fullWidth size="lg" iconRight="arrow-right" />
      </View>
    </View>
  );
};

const IntroStepLogin: React.FC<{ onSocialContinue: () => void; onEmailContinue: () => void }> = ({
  onSocialContinue,
  onEmailContinue,
}) => {
  const { colors, spacing, radius, typography, shadows } = useTheme();

  return (
    <View style={[styles.stepContainer, { paddingHorizontal: spacing.lg, justifyContent: 'flex-start', alignItems: 'center', paddingTop: spacing.xxl }]}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <Image
          source={require('../../../assets/social-dance-logo.png')}
          style={styles.onboardingLogoStandalone}
          resizeMode="contain"
        />
        <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>Giriş Yap</Text>
        <Text
          style={[
            typography.caption,
            {
              fontFamily: 'Poppins_300Light',
              color: '#ECE8FA',
              textAlign: 'center',
              marginTop: spacing.xl,
              marginHorizontal: spacing.sm,
              fontSize: 13,
              lineHeight: 18,
            },
          ]}
        >
          Socialdance dünyasına katılmak için sana en uygun giriş yöntemini seç.
        </Text>
      </View>

      <View style={{ width: '100%', gap: 12, marginTop: spacing.xxxxl + spacing.xs }}>
        <TouchableOpacity
          onPress={onSocialContinue}
          activeOpacity={0.8}
          style={[
            styles.socialButton,
            {
              backgroundColor: '#1E1E1E',
              borderWidth: 0.5,
              borderColor: '#FFFFFF',
              borderRadius: radius.xl,
              ...shadows.sm,
            },
          ]}
        >
          <GoogleColorIcon size={22} style={styles.socialIconLeft} />
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Google ile Devam Et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSocialContinue}
          activeOpacity={0.8}
          style={[
            styles.socialButton,
            {
              backgroundColor: '#1E1E1E',
              borderWidth: 0.5,
              borderColor: '#FFFFFF',
              borderRadius: radius.xl,
              ...shadows.sm,
            },
          ]}
        >
          <Icon name="apple" size={22} color="#FFFFFF" style={styles.socialIconLeft} />
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Apple ile Devam Et</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: spacing.xl, width: '100%' }}>
        <LinearGradient
          colors={[colors.background, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientBorder, { borderRadius: radius.xl }]}
        >
          <LinearGradient
            colors={[colors.background, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradientButton, { borderRadius: radius.xl - 1 }]}
          >
            <TouchableOpacity onPress={onEmailContinue} activeOpacity={0.8} style={styles.gradientContent}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>E-posta ile Devam Et</Text>
              <Icon name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </LinearGradient>
        </LinearGradient>
      </View>
    </View>
  );
};

const Step1Profile: React.FC<{ next: () => void; onShowAlert: (title: string, message: string) => void }> = ({ next, onShowAlert }) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  const openGalleryAndSetAvatar = () => {
    setTimeout(async () => {
      let ImagePicker: typeof import('expo-image-picker') | null = null;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch {
        onShowAlert(
          'Galeri kullanılamıyor',
          'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler bölümünden Fotoğraflar iznini açın. Hâlâ çalışmıyorsa bilgisayarda "npx expo run:ios" veya "npx expo run:android" çalıştırıp uygulamayı yeniden yükleyin.'
        );
        return;
      }
      try {
        if (!ImagePicker?.requestMediaLibraryPermissionsAsync) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          onShowAlert(
            'Galeri izni gerekli',
            'Profil fotoğrafı için Ayarlar > Bu uygulama > İzinler (veya Fotoğraflar) bölümünden izin verin. Expo Go kullanıyorsanız "Expo Go" uygulamasının izinlerine bakın.'
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
        onShowAlert(
          isNativeError ? 'Galeri bu ortamda çalışmıyor' : 'Hata',
          isNativeError
            ? 'Expo Go kullanıyorsanız: Ayarlar > Expo Go > İzinler > Fotoğraflar açın. Yoksa bilgisayarda "npx expo run:ios" veya "npx expo run:android" ile uygulamayı derleyip telefona yükleyin; izinler o build\'de görünür.'
            : 'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.'
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
          <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>Profilini Oluştur</Text>
          <Text style={[styles.stepSubtitle, { color: '#FFFFFF' }]}>Seni dans pistinde nasıl tanıyalım?</Text>
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

const Step2Permissions: React.FC<{ next: () => void; onShowAlert: (title: string, message: string) => void }> = ({ next, onShowAlert }) => {
  const { colors, spacing, radius } = useTheme();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Sayfa açıldığında konum ve bildirim izinlerini otomatik iste (sırayla)
  useEffect(() => {
    const t1 = setTimeout(() => requestLocationPermission(true), 400);
    const t2 = setTimeout(() => requestNotificationPermission(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const requestLocationPermission = async (enable: boolean) => {
    if (!enable) {
      setLocationEnabled(false);
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
        onShowAlert(
          'Konum izni',
          'Çevrenizdeki etkinlikleri gösterebilmek için konum erişimine izin vermeniz gerekir. İsterseniz ayarlardan sonra açabilirsiniz.'
        );
      }
    } catch {
      setLocationEnabled(false);
      onShowAlert('Hata', 'Konum izni alınamadı.');
    } finally {
      setLocationLoading(false);
    }
  };

  const requestNotificationPermission = async (enable: boolean) => {
    if (!enable) {
      setNotificationsEnabled(false);
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
        onShowAlert(
          'Bildirim izni',
          'Davet ve duyurulardan haberdar olmak için bildirimlere izin vermeniz gerekir. İsterseniz ayarlardan sonra açabilirsiniz.'
        );
      }
    } catch {
      setNotificationsEnabled(false);
      onShowAlert('Hata', 'Bildirim izni alınamadı.');
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

      <Text style={[styles.stepTitle, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxxl }]}>Deneyimi Tamamla</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
        Sana en uygun etkinlikleri bulmamız ve seni haberdar etmemiz için izin ver.
      </Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
        <View style={[styles.permRow, { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.lg }]}>
          <View style={[styles.permIcon, { backgroundColor: colors.primaryAlpha10 }]}>
            <Icon name="map-marker" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[{ fontWeight: '600', fontSize: 14, color: colors.text }]}>Konum</Text>
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
            <Text style={[{ fontWeight: '600', fontSize: 14, color: colors.text }]}>Bildirimler</Text>
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
      <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>
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
        <Text style={[{ fontWeight: '600', fontSize: 14, color: colors.text, marginBottom: spacing.sm }]}>Diğer ilgi alanları</Text>
        <Input placeholder="Örn: Bale, Pilates..." leftIcon="pencil" />
      </View>

      <View style={{ flex: 1 }} />
      <Button title="Kaydet ve Başla" onPress={onFinish} fullWidth iconRight="arrow-right" size="lg" />
    </ScrollView>
  );
};

export const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors, spacing, radius } = useTheme();
  const initialStep = route.params?.startFromStep ?? 1;
  const [step, setStep] = useState(initialStep);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Ekranı sağa çekme hareketini daha kolay yakala
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 30) {
          const currentStep = stepRef.current;
          // Sağa kaydırma: geri git
          if (currentStep > 1) {
            setStep((prev) => Math.max(1, prev - 1));
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      },
    })
  ).current;

  const handleFinish = async () => {
    const { storage } = await import('../../services/storage');
    await storage.setLoggedIn(true);
    (navigation.getParent() as any)?.reset({ index: 0, routes: [{ name: 'App' }] });
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
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        {step > 1 ? (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={[styles.backBtn, { borderRadius: radius.full }]}
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <View style={styles.dots}>
          {step <= 2 &&
            [1, 2].map((i) => (
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
            <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textTertiary }]}>Atla</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.stepWrapper, { paddingHorizontal: spacing.lg }]}>
          {step === 1 && <IntroStepWelcome next={() => setStep(2)} />}
          {step === 2 && <IntroStepAbout next={() => setStep(3)} />}
          {step === 3 && (
            <IntroStepLogin
              onSocialContinue={() => setStep(4)}
              onEmailContinue={() => navigation.navigate('SignUp')}
            />
          )}
          {step === 4 && <Step3Preferences onFinish={() => setStep(5)} />}
          {step === 5 && <Step2Permissions next={handleFinish} onShowAlert={(title, message) => setAlertModal({ title, message })} />}
        </View>
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
    fontWeight: '600',
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
  onboardingLogoStandalone: {
    width: 280,
    height: 150,
  },
  socialButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconLeft: {
    marginRight: 19,
  },
  gradientBorder: {
    padding: 1,
    width: '100%',
    overflow: 'hidden',
  },
  gradientButton: {
    height: 56,
    overflow: 'hidden',
    width: '100%',
  },
  gradientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

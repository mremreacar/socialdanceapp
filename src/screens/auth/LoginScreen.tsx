import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { AuthStackParamList } from '../../types/navigation';
import { storage } from '../../services/storage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography, shadows } = useTheme();
  const [emailOpen, setEmailOpen] = useState(false);

  const handleLogin = async () => {
    await storage.setLoggedIn(true);
    (navigation.getParent() as any)?.reset({ index: 0, routes: [{ name: 'App' }] });
  };

  const goToCreateProfile = () => {
    navigation.navigate('Onboarding');
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.decorCircle, { backgroundColor: colors.primaryAlpha20 }]} />

            <View style={styles.logoSection}>
            <View style={[styles.logoContainer, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.xxl }]}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3003/3003889.png' }}
                style={styles.logo}
              />
            </View>
            <Text style={[typography.h1, { color: colors.text, marginTop: spacing.lg }]}>Socialdance</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xxxl }]}>
              Dans dünyasını keşfet, yeni partnerler bul ve en iyi etkinliklerde yerini al.
            </Text>
          </View>

          <View style={[styles.buttonSection, { paddingHorizontal: spacing.xxl }]}>
            <TouchableOpacity
              onPress={goToCreateProfile}
              activeOpacity={0.8}
              style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, ...shadows.sm }]}
            >
              <Image source={{ uri: 'https://www.svgrepo.com/show/475656/google-color.svg' }} style={styles.socialIcon} />
              <Text style={[typography.bodySmallBold, { color: colors.text }]}>Google ile Devam Et</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToCreateProfile}
              activeOpacity={0.8}
              style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, ...shadows.sm }]}
            >
              <Icon name="apple" size={22} color={colors.text} style={styles.socialIconLeft} />
              <Text style={[typography.bodySmallBold, { color: colors.text }]}>Apple ile Devam Et</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={['#833AB4', '#FD1D1D', '#F77737']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientButton, { borderRadius: radius.xl }]}
            >
              <TouchableOpacity onPress={goToCreateProfile} activeOpacity={0.8} style={styles.gradientContent}>
                <Icon name="instagram" size={22} color="#FFFFFF" style={styles.socialIconLeft} />
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Instagram ile Bağlan</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[typography.label, { color: colors.textTertiary, marginHorizontal: spacing.lg }]}>VEYA</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity onPress={() => setEmailOpen(!emailOpen)} style={styles.emailToggle} activeOpacity={0.7}>
              <Icon name="email-outline" size={18} color={colors.textSecondary} />
              <Text style={[typography.bodySmallMedium, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
                E-posta ile Giriş Yap
              </Text>
            </TouchableOpacity>

            {emailOpen && (
              <View style={[styles.emailForm, { backgroundColor: colors.surface, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.borderLight, ...shadows.xl }]}>
                <Input placeholder="E-posta Adresi" keyboardType="email-address" autoCapitalize="none" />
                <Input placeholder="Şifre" secureTextEntry containerStyle={{ marginTop: spacing.md }} />
                <Button title="Giriş Yap" onPress={handleLogin} fullWidth style={{ marginTop: spacing.md }} />
                <View style={styles.signupRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Hesabın yok mu? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                    <Text style={[typography.captionBold, { color: colors.primary }]}>Kayıt Ol</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={[typography.label, { color: colors.textTertiary, textAlign: 'center', paddingHorizontal: spacing.xxxl, marginBottom: spacing.lg, fontSize: 9 }]}>
            Devam ederek Socialdance Kullanım Koşulları'nı ve Gizlilik Politikası'nı kabul etmiş olursunuz.
          </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  decorCircle: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  buttonSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    height: 56,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 24,
  },
  socialIconLeft: {
    position: 'absolute',
    left: 24,
  },
  gradientButton: {
    height: 56,
    overflow: 'hidden',
  },
  gradientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emailForm: {
    padding: 24,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
});

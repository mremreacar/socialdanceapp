import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services/api/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailLogin'>;

const inputBorderColor = 'rgba(255,255,255,0.25)';

export const EmailLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorBorderColor = error ? colors.error : inputBorderColor;

  const isEmailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const isFormValid = isEmailValid && password.length >= 1;

  const handleLogin = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await authService.login(email, password);
      navigation.replace('Preferences');
    } catch (e: any) {
      setError(e?.message || 'Giris yapilamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Giriş Yap" showBack showMenu={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.formSection}>
              <Image
                source={require('../../../assets/social_dance.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[typography.h1, { color: '#FFFFFF', marginBottom: spacing.xl, textAlign: 'center' }]}>E-posta ile Giriş</Text>
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginBottom: spacing.xl, textAlign: 'center' }]}>
                Hesabına giriş yap ve devam et.
              </Text>

              <View style={styles.form}>
                <Input
                  placeholder="E-posta Adresi"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="email-outline"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                  }}
                  backgroundColor="transparent"
                  borderColor={errorBorderColor}
                  height={60}
                  style={{ color: '#FFFFFF' }}
                />
                <Input
                  placeholder="Şifre"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-outline"
                  rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPassword((v) => !v)}
                  containerStyle={{ marginTop: spacing.md }}
                  backgroundColor="transparent"
                  borderColor={errorBorderColor}
                  height={60}
                  style={{ color: '#FFFFFF' }}
                  autoCorrect={false}
                />
                <View style={{ alignItems: 'flex-end', marginTop: spacing.md }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })} activeOpacity={0.8}>
                    <Text style={[typography.captionBold, { color: colors.primary }]}>
                      Şifremi Unuttum
                    </Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title={loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  onPress={handleLogin}
                  fullWidth
                  style={{ marginTop: spacing.xl }}
                  disabled={!isFormValid || loading}
                />
                {error ? (
                  <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
                    {error}
                  </Text>
                ) : null}
              </View>

              <View style={styles.signupRow}>
                <Text style={[typography.caption, { color: '#FFFFFF' }]}>Hesabın yok mu? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={[typography.captionBold, { color: colors.primary }]}>Hesap Oluştur</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  formSection: {
    width: '100%',
    maxWidth: 520,
  },
  logo: {
    width: 280,
    height: 110,
    alignSelf: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

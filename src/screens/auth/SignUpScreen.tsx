import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const requirements = [
  { key: 'length', label: 'En az 8 karakter', check: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'En az 1 büyük harf', check: (p: string) => /[A-Z]/.test(p) },
  { key: 'digitOrSymbol', label: 'En az 1 rakam veya sembol', check: (p: string) => /[^a-zA-Z]/.test(p) },
] as const;

const inputBorderColor = 'rgba(255,255,255,0.25)';

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const requirementStatus = useMemo(() => requirements.map((r) => ({ ...r, met: r.check(password) })), [password]);

  const isEmailValid = useMemo(
    () => /^\S+@\S+\.\S+$/.test(email.trim()),
    [email]
  );

  const allRequirementsMet = useMemo(
    () => requirementStatus.every((r) => r.met),
    [requirementStatus]
  );

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    isEmailValid &&
    allRequirementsMet &&
    passwordRepeat.length > 0 &&
    passwordRepeat === password;

  const handleSignUp = () => {
    if (!isFormValid) return;
    navigation.replace('Onboarding', { startFromStep: 4 });
  };

  return (
    <Screen>
      <Header title="Kayıt Ol" showBack showMenu={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formSection}>
            <Text style={[typography.h1, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Hesap Oluştur</Text>
            <Text style={[typography.bodySmall, { color: '#FFFFFF', marginBottom: spacing.lg }]}>
              Hesabını oluştur ve dans dünyasına katıl.
            </Text>

            <View style={[styles.form]}>
              <Input
                placeholder="Ad"
                leftIcon="account-outline"
                value={firstName}
                onChangeText={setFirstName}
                backgroundColor="transparent"
                borderColor={inputBorderColor}
                style={{ color: '#FFFFFF' }}
              />
              <Input
                placeholder="Soyad"
                leftIcon="account-outline"
                containerStyle={{ marginTop: spacing.md }}
                value={lastName}
                onChangeText={setLastName}
                backgroundColor="transparent"
                borderColor={inputBorderColor}
                style={{ color: '#FFFFFF' }}
              />
              <Input
                placeholder="E-posta Adresi"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                containerStyle={{ marginTop: spacing.md }}
                value={email}
                onChangeText={setEmail}
                backgroundColor="transparent"
                borderColor={inputBorderColor}
                style={{ color: '#FFFFFF' }}
              />
              <Input
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon="lock-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((v) => !v)}
                containerStyle={{ marginTop: spacing.md }}
                backgroundColor="transparent"
                borderColor={inputBorderColor}
                style={{ color: '#FFFFFF' }}
              />
              <Input
                placeholder="Şifre Tekrar"
                value={passwordRepeat}
                onChangeText={setPasswordRepeat}
                secureTextEntry={!showPasswordRepeat}
                leftIcon="lock-outline"
                rightIcon={showPasswordRepeat ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPasswordRepeat((v) => !v)}
                containerStyle={{ marginTop: spacing.md }}
                backgroundColor="transparent"
                borderColor={inputBorderColor}
                style={{ color: '#FFFFFF' }}
              />
              <View style={[styles.requirementsBox, { backgroundColor: '#311831', borderRadius: 12, padding: spacing.lg, marginTop: spacing.lg }]}>
                <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>GEREKSİNİMLER</Text>
                {requirementStatus.map(({ key, label, met }) => (
                  <View key={key} style={styles.requirementRow}>
                    <Icon name={met ? 'check-circle' : 'circle-outline'} size={20} color={met ? '#22c55e' : '#6B7280'} />
                    <Text style={[typography.bodySmall, { color: '#E5E7EB', marginLeft: spacing.sm }]}>{label}</Text>
                  </View>
                ))}
              </View>
              <Button title="Kayıt Ol" onPress={handleSignUp} fullWidth style={{ marginTop: spacing.xl }} disabled={!isFormValid} />
            </View>

            <View style={styles.loginRow}>
              <Text style={[typography.caption, { color: '#FFFFFF' }]}>Zaten hesabın var mı? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>Giriş Yap</Text>
              </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 24,
  },
  formSection: {
    flex: 1,
  },
  form: {
    width: '100%',
  },
  requirementsBox: {
    width: '100%',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

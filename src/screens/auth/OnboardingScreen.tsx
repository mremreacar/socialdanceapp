import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { spacing, typography } = useTheme();

  return (
    <Screen>
      <View
        style={[
          styles.stepContainer,
          { paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <View style={{ alignItems: 'center', width: '100%' }}>
          <Image source={require('../../../assets/social_dance.png')} style={styles.onboardingLogoStandalone} resizeMode="contain" />
          <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xxl, fontWeight: '500' }]}>
            Hazırsan başlayalım
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: '#ECE8FA',
                textAlign: 'center',
                marginTop: spacing.xl,
                marginHorizontal: spacing.sm,
                fontSize: 13,
                lineHeight: 18,
              },
            ]}
          >
            Giriş yap ve etkinlikleri keşfetmeye başla.
          </Text>
        </View>

        <View style={{ marginTop: spacing.xxl, width: '100%' }}>
          <Button title="Hemen Başla" onPress={() => navigation.navigate('Login')} fullWidth size="lg" iconRight="arrow-right" />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 24,
  },
  onboardingLogoStandalone: {
    width: 280,
    height: 150,
  },
});

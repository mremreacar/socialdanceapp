import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';
import { useProfile } from '../../context/ProfileContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Preferences'>;

const DANCES = ['Salsa', 'Bachata', 'Hip-Hop', 'Tango', 'Kizomba', 'Swing', 'Zumba', 'Vals', 'Modern'] as const;

export const PreferencesScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const { profile, updateProfile } = useProfile();

  const initialSelected = useMemo(() => {
    const existing = profile.favoriteDances?.length ? profile.favoriteDances : [];
    return existing.length ? existing : ['Salsa'];
  }, [profile.favoriteDances]);

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [otherInterests, setOtherInterests] = useState(profile.otherInterests ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDance = (dance: string) => {
    setSelected((prev) => (prev.includes(dance) ? prev.filter((d) => d !== dance) : [...prev, dance]));
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        favoriteDances: selected,
        otherInterests: otherInterests.trim(),
      });
      (navigation.getParent() as any)?.reset({ index: 0, routes: [{ name: 'App' }] });
    } catch (e: any) {
      setError(e?.message || 'Tercihleriniz kaydedilemedi. Lütfen tekrar deneyiniz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.container, { padding: spacing.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>
            Hangi danslar seni <Text style={{ color: colors.primary }}>harekete geçirir?</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sana en uygun etkinlikleri önerebilmemiz için ilgilendiğin türleri seç.
          </Text>

          <View style={[styles.chipGrid, { marginTop: spacing.xxl }]}>
            {DANCES.map((dance) => (
              <Chip
                key={dance}
                label={dance}
                selected={selected.includes(dance)}
                onPress={() => toggleDance(dance)}
                icon={selected.includes(dance) ? 'check' : undefined}
              />
            ))}
          </View>

          <View style={{ marginTop: spacing.xxxl }}>
            <Text style={[styles.fieldLabel, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Diğer ilgi alanları</Text>
            <Input
              placeholder="Örn: Bale, Pilates..."
              leftIcon="pencil"
              value={otherInterests}
              onChangeText={setOtherInterests}
            />
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />
          {error ? (
            <Text style={[typography.bodySmall, { color: colors.error, textAlign: 'center', marginBottom: spacing.md }]}>
              {error}
            </Text>
          ) : null}
          <Button title={saving ? 'Kaydediliyor...' : 'Kaydet'} onPress={handleContinue} fullWidth iconRight="arrow-right" size="lg" disabled={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

export const SettingsPaymentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <Screen>
      <Header title="Ödemeler ve Abonelikler" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.body, { color: '#9CA3AF', marginBottom: spacing.lg }]}>
          Kayıtlı ödeme yöntemleriniz ve abonelik durumunuz.
        </Text>
        <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: 'rgba(255,255,255,0.12)' }]}>
          <View style={[styles.row, { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryAlpha20 }]}>
              <Icon name="credit-card" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Visa •••• 4242</Text>
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>Ana ödeme yöntemi</Text>
            </View>
            <TouchableOpacity hitSlop={12}>
              <Text style={[typography.body, { color: colors.primary }]}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.row, { padding: spacing.lg }]} activeOpacity={0.7}>
            <Icon name="plus-circle-outline" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.sm }]}>Yeni ödeme yöntemi ekle</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Abonelik</Text>
          <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.purpleAlpha }]}>
                <Icon name="crown" size={20} color={colors.purple} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Ücretsiz Plan</Text>
                <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>Temel özellikler aktif</Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.md }]}>
              Premium abonelik ile etkinlik oluşturma limiti, öne çıkan profil ve daha fazlasına erişin.
            </Text>
            <Button title="Planları Görüntüle" onPress={() => {}} variant="secondary" fullWidth style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

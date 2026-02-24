import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ProductDetail'>;

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Screen>
      <Header title="" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' }}
          style={[styles.image, { backgroundColor: colors.surfaceSecondary }]}
        />
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.text }]}>Salsa Ayakkabısı</Text>
          <Text style={[typography.h4, { color: colors.primary, marginTop: spacing.sm }]}>₺450</Text>

          <View style={[styles.sellerRow, { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg }]}>
            <Avatar source="https://i.pravatar.cc/150?u=seller" size="md" />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[typography.bodySmallBold, { color: colors.text }]}>Satıcı</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>⭐ 4.8</Text>
            </View>
            <Button title="Mesaj" variant="outline" size="sm" onPress={() => {}} />
          </View>

          <Text style={[typography.bodySmall, { color: colors.text, marginTop: spacing.xl }]}>
            Profesyonel salsa ayakkabısı, az kullanılmış. Numara 38.
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, padding: spacing.lg }]}>
        <Text style={[typography.h4, { color: colors.primary }]}>₺450</Text>
        <Button title="Satın Al" onPress={() => {}} style={{ flex: 1, marginLeft: spacing.lg }} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
});

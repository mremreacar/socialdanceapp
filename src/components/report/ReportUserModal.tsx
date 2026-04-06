import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';
import { ApiError, hasSupabaseConfig } from '../../services/api/apiClient';
import {
  ModerationReportType,
  moderationReportsService,
  type ModerationReportTypeValue,
} from '../../services/api/moderationReports';

export const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'spam', label: 'Spam veya reklam' },
  { key: 'harassment', label: 'Taciz veya hakaret' },
  { key: 'scam', label: 'Dolandırıcılık' },
  { key: 'inappropriate', label: 'Uygunsuz içerik' },
  { key: 'other', label: 'Diğer' },
];

export type ReportUserModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  reportedProfileId: string;
  /** Sohbetten gelindiyse dolu; `dm_user` + kayıt için kullanılır. Boşsa `profile` şikayeti. */
  conversationId?: string | null;
};

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  onRequestClose,
  reportedProfileId,
  conversationId,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [reasonKey, setReasonKey] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReasonKey(null);
      setDetails('');
      setSubmitting(false);
    }
  }, [visible]);

  const reportType: ModerationReportTypeValue = conversationId
    ? ModerationReportType.conversation
    : ModerationReportType.user;

  const close = () => {
    if (submitting) return;
    onRequestClose();
  };

  const submit = async () => {
    if (!reasonKey) {
      Alert.alert('Eksik bilgi', 'Lütfen bir şikayet nedeni seçin.');
      return;
    }
    if (!hasSupabaseConfig()) {
      Alert.alert('Hata', 'Supabase yapılandırması eksik.');
      return;
    }
    setSubmitting(true);
    try {
      await moderationReportsService.createReport({
        reportType,
        reportedProfileId,
        conversationId: conversationId ?? null,
        reason: reasonKey,
        details: details.trim() || null,
      });
      onRequestClose();
      Alert.alert(
        'Teşekkürler',
        'Geri bildiriminiz bize ulaştı. Ekibimiz kaydınızı en kısa sürede inceleyecek; topluluğu güvenli ve saygılı tutmamıza yardımcı olduğunuz için teşekkür ederiz.',
        [{ text: 'Tamam' }],
      );
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Şikayet gönderilemedi.';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.reportOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.absoluteFill} activeOpacity={1} onPress={close} />
        <View
          style={[
            styles.reportCard,
            {
              backgroundColor: colors.headerBg ?? '#2C1C2D',
              borderRadius: radius.xl,
            },
          ]}
        >
          <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>Şikayet</Text>
          <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
            Nedenini seçin; isteğe bağlı açıklama ekleyebilirsiniz.
          </Text>
          <ScrollView
            style={{ maxHeight: 220 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {REPORT_REASONS.map((r) => {
              const selected = reasonKey === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setReasonKey(r.key)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    marginBottom: spacing.xs,
                    backgroundColor: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[typography.body, { color: '#FFFFFF' }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Ek açıklama (isteğe bağlı)"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            style={[
              styles.reportDetailsInput,
              {
                backgroundColor: '#482347',
                borderRadius: radius.md,
                color: '#FFF',
                marginTop: spacing.md,
                padding: spacing.md,
              },
            ]}
          />
          <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm }}>
            <TouchableOpacity
              onPress={close}
              disabled={submitting}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.full,
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void submit()}
              disabled={submitting}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.full,
                alignItems: 'center',
                backgroundColor: colors.primary,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  reportCard: {
    padding: 20,
  },
  reportDetailsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

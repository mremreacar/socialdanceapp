import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, type IconName } from '../ui/Icon';

const MODAL_BG = '#2C1C2D';
const OVERLAY_BG = 'rgba(0,0,0,0.6)';
const TITLE_COLOR = '#FFFFFF';
const MESSAGE_COLOR = '#919FB4';
const CANCEL_BORDER = '#354359';
const CANCEL_TEXT = '#C4CDDA';
const CONFIRM_BG = '#EE2AEE';
const DANGER_BG = '#4A1F2A';
const DANGER_BORDER = '#7F1D1D';
const DANGER_TEXT = '#FCA5A5';

type ConfirmVariant = 'primary' | 'danger';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: IconName;
  confirmVariant?: ConfirmVariant;
  loading?: boolean;
  /** Tek buton (örn. Tamam) gösterir; takibi bırak tarzı aynı görünüm */
  singleButton?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  icon,
  confirmVariant = 'primary',
  loading = false,
  singleButton = false,
  cancelLabel = 'İptal',
  confirmLabel = 'Eminim',
  onCancel,
  onConfirm,
}) => {
  const { typography, radius } = useTheme();

  const confirmStyle =
    confirmVariant === 'danger'
      ? { backgroundColor: DANGER_BG, borderColor: DANGER_BORDER, borderWidth: 1 }
      : { backgroundColor: CONFIRM_BG };

  const confirmTextColor = confirmVariant === 'danger' ? DANGER_TEXT : '#FFFFFF';

  const handleConfirm = () => {
    if (loading) return;
    onConfirm();
    if (singleButton) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.box} onPress={(e) => e.stopPropagation()}>
          {icon ? (
            <View style={styles.iconWrap}>
              <View style={styles.iconBadge}>
                <Icon name={icon} size={24} color={confirmVariant === 'danger' ? DANGER_TEXT : '#FFFFFF'} />
              </View>
            </View>
          ) : null}
          <Text style={[typography.h4, styles.title]}>{title}</Text>
          <Text style={[typography.bodySmall, styles.message]}>{message}</Text>
          <View style={styles.actions}>
            {!singleButton && (
              <TouchableOpacity
                onPress={onCancel}
                disabled={loading}
                style={[styles.cancelBtn, { borderColor: CANCEL_BORDER, borderRadius: radius.lg }]}
                activeOpacity={0.8}
              >
                <Text style={[typography.bodySmallBold, { color: CANCEL_TEXT }]}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleConfirm}
              style={[
                styles.confirmBtn,
                { borderRadius: radius.lg },
                confirmStyle,
                singleButton ? styles.singleBtn : undefined,
                loading ? styles.disabledBtn : undefined,
              ]}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={confirmTextColor} size="small" />
              ) : (
                <Text style={[typography.bodySmallBold, { color: confirmTextColor }]}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY_BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: MODAL_BG,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: TITLE_COLOR,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: MESSAGE_COLOR,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleBtn: {
    flex: 1,
  },
  disabledBtn: {
    opacity: 0.7,
  },
});

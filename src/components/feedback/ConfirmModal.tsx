import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme';

const MODAL_BG = '#2C1C2D';
const OVERLAY_BG = 'rgba(0,0,0,0.6)';
const TITLE_COLOR = '#FFFFFF';
const MESSAGE_COLOR = '#919FB4';
const CANCEL_BORDER = '#354359';
const CANCEL_TEXT = '#C4CDDA';
const CONFIRM_BG = '#EE2AEE';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  cancelLabel = 'İptal',
  confirmLabel = 'Eminim',
  onCancel,
  onConfirm,
}) => {
  const { typography, spacing, radius } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.box} onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.h4, styles.title]}>{title}</Text>
          <Text style={[typography.bodySmall, styles.message]}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: CANCEL_BORDER, borderRadius: radius.lg }]}
              activeOpacity={0.8}
            >
              <Text style={[typography.bodySmallBold, { color: CANCEL_TEXT }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.confirmBtn, { backgroundColor: CONFIRM_BG, borderRadius: radius.lg }]}
              activeOpacity={0.8}
            >
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
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
});

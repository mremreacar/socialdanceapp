import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ViewStyle, TextInputProps, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  borderColor?: string;
  /** Input kutusunun iç arka plan rengi (örn. #311831). transparent = sayfa rengiyle bütünleşik */
  backgroundColor?: string;
  /** Label rengi (varsayılan: theme textSecondary) */
  labelColor?: string;
  /** Sol ikon rengi (varsayılan: theme inputPlaceholder) */
  leftIconColor?: string;
  /** Sağ ikon rengi (varsayılan: theme inputPlaceholder) */
  rightIconColor?: string;
  /** Placeholder metin rengi (varsayılan: theme inputPlaceholder) */
  placeholderTextColor?: string;
  /** Sol ikonu etkinlik detayındaki gibi kutu içinde göster (border + arka plan) */
  leftIconBox?: boolean;
  /** Sol ikonu border dışında, label satırında (label yanında) göster */
  leftIconWithLabel?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  borderColor: borderColorProp,
  backgroundColor: backgroundColorProp,
  labelColor: labelColorProp,
  leftIconColor: leftIconColorProp,
  rightIconColor: rightIconColorProp,
  placeholderTextColor: placeholderTextColorProp,
  leftIconBox: leftIconBoxProp,
  leftIconWithLabel: leftIconWithLabelProp = false,
  style,
  multiline,
  ...props
}) => {
  const { colors, typography, radius, spacing, borders } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = borderColorProp ?? (focused ? colors.primary : error ? colors.error : colors.inputBorder);
  const inputBg = backgroundColorProp ?? colors.inputBg;
  const labelColor = labelColorProp ?? colors.textSecondary;
  const leftIconColor = leftIconColorProp ?? colors.inputPlaceholder;
  const rightIconColor = rightIconColorProp ?? colors.inputPlaceholder;
  const leftIconBox = leftIconBoxProp ?? false;
  const leftIconWithLabel = leftIconWithLabelProp ?? false;
  const isMultiline = multiline === true;
  const showIconInsideBorder = leftIcon && !leftIconWithLabel;

  const containerHeight = isMultiline ? undefined : INPUT_HEIGHT;
  const containerMinHeight = isMultiline ? 100 : INPUT_HEIGHT;

  return (
    <View style={containerStyle}>
      {(label || (leftIcon && leftIconWithLabel)) && (
        <View style={styles.labelRow}>
          {leftIcon && leftIconWithLabel && (
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name={leftIcon} size={18} color={leftIconColor} />
            </View>
          )}
          {label && (
            <Text
              style={[
                typography.label,
                { color: labelColor, marginBottom: spacing.xs },
                leftIconWithLabel && { marginBottom: 0 },
                !leftIconWithLabel && { marginLeft: spacing.xs },
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      )}
      {label && leftIconWithLabel && <View style={{ height: spacing.xs }} />}
      <View
        style={[
          styles.inputContainer,
          isMultiline && styles.inputContainerMultiline,
          {
            backgroundColor: inputBg,
            borderRadius: radius.xl,
            borderWidth: borders.thin,
            borderColor,
            paddingHorizontal: spacing.lg,
            height: containerHeight,
            minHeight: containerMinHeight,
          },
        ]}
      >
        {showIconInsideBorder && (
          leftIconBox ? (
            <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
              <Icon name={leftIcon} size={18} color={leftIconColor} />
            </View>
          ) : (
            <Icon
              name={leftIcon}
              size={20}
              color={leftIconColor}
              style={{ marginRight: spacing.sm }}
            />
          )
        )}
        <TextInput
          {...props}
          multiline={multiline}
          style={[
            styles.input,
            typography.body,
            styles.inputText,
            {
              color: colors.text,
              flex: 1,
              // iOS'ta yazmaya başlanınca metnin yukarı fırlamaması için
              // tek satırlı inputlarda hafif bir paddingTop veriyoruz
              ...(Platform.OS === 'ios' && !isMultiline ? { paddingTop: 6 } : null),
            },
            isMultiline && styles.inputMultiline,
            style,
          ]}
          placeholderTextColor={placeholderTextColorProp ?? colors.inputPlaceholder}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          {...(Platform.OS === 'android' && { includeFontPadding: false })}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {rightIcon && (
          onRightIconPress ? (
            <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginLeft: spacing.sm }}>
              <Icon name={rightIcon} size={20} color={rightIconColor} />
            </TouchableOpacity>
          ) : (
            <Icon name={rightIcon} size={20} color={rightIconColor} style={{ marginLeft: spacing.sm }} />
          )
        )}
      </View>
      {error && (
        <Text
          style={[
            typography.caption,
            { color: colors.error, marginTop: spacing.xs, marginLeft: spacing.xs },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const INPUT_HEIGHT = 52;

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  leftIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    padding: 0,
    paddingVertical: 0,
    minHeight: INPUT_HEIGHT,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 4,
  },
  inputText: {
    lineHeight: 20,
  },
});

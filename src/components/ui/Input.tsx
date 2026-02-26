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
  /** Input kutusunun iç arka plan rengi (örn. #311831) */
  backgroundColor?: string;
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
  style,
  ...props
}) => {
  const { colors, typography, radius, spacing, borders } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = borderColorProp ?? (focused ? colors.primary : error ? colors.error : colors.inputBorder);
  const inputBg = backgroundColorProp ?? colors.inputBg;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.xs, marginLeft: spacing.xs },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderRadius: radius.xl,
            borderWidth: borders.thin,
            borderColor,
            paddingHorizontal: spacing.lg,
            height: INPUT_HEIGHT,
          },
        ]}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={colors.inputPlaceholder}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <TextInput
          {...props}
          style={[
            styles.input,
            typography.body,
            styles.inputText,
            { color: colors.text, flex: 1 },
            style,
          ]}
          placeholderTextColor={colors.inputPlaceholder}
          textAlignVertical="center"
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
              <Icon name={rightIcon} size={20} color={colors.inputPlaceholder} />
            </TouchableOpacity>
          ) : (
            <Icon name={rightIcon} size={20} color={colors.inputPlaceholder} style={{ marginLeft: spacing.sm }} />
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 0,
    paddingVertical: 0,
    height: INPUT_HEIGHT,
  },
  inputText: {
    lineHeight: 20,
  },
});

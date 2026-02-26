import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}) => {
  const { colors, typography, radius, spacing, borders } = useTheme();
  const [focused, setFocused] = useState(false);

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
            backgroundColor: colors.inputBg,
            borderRadius: radius.xl,
            borderWidth: borders.thin,
            borderColor: focused ? colors.primary : error ? colors.error : colors.inputBorder,
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
          <Icon
            name={rightIcon}
            size={20}
            color={colors.inputPlaceholder}
            style={{ marginLeft: spacing.sm }}
          />
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

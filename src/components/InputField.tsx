import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  error?: string | null;
  hint?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  iconName,
  isPassword = false,
  error,
  hint,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={20}
            color={
              error
                ? Colors.error
                : isFocused
                ? Colors.primaryLight
                : Colors.textMuted
            }
            style={styles.leadingIcon}
          />
        ) : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={Colors.primary}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            hitSlop={10}
            onPress={() => setShowPassword(!showPassword)}
            style={styles.trailingIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: Colors.inputBorderFocused,
    backgroundColor: '#121C30',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.inputText,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  trailingIcon: {
    padding: 4,
    marginLeft: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
  },
});


import { useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font, spacing, touch } from '../theme/theme';

export default function AppInput({
  label,
  error,
  secure,
  style,
  fieldStyle,
  labelStyle,
  accessibilityLabel,
  leadingIcon,
  secureToggleIcon = false,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string | boolean | null;
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  leadingIcon?: ComponentProps<typeof Ionicons>['name'];
  secureToggleIcon?: boolean;
}) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={[styles.field, fieldStyle, error && styles.fieldError]}>
        {leadingIcon ? <Ionicons name={leadingIcon} size={22} color={colors.deep} style={styles.leadingIcon} /> : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.inactive}
          autoCapitalize="none"
          {...props}
          secureTextEntry={hidden}
          accessibilityLabel={accessibilityLabel || label}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            style={styles.eye}
          >
            {secureToggleIcon ? (
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.secondary} />
            ) : (
              <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: font.body, color: colors.text, fontWeight: '600', marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, minHeight: touch.min,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, minWidth: 0, fontSize: font.body, color: colors.text, paddingVertical: 12 },
  leadingIcon: { marginRight: spacing.md },
  eye: { minWidth: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  toggle: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  error: { fontSize: font.body, color: colors.danger, marginTop: 6, lineHeight: 22 },
});

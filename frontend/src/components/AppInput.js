import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius, font, spacing, touch } from '../theme/theme';

export default function AppInput({ label, error, secure, style, fieldStyle, labelStyle, accessibilityLabel, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={[styles.field, fieldStyle, error && styles.fieldError]}>
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
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, minHeight: touch.min,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: 12 },
  eye: { minWidth: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  toggle: { fontSize: font.body, color: colors.primary, fontWeight: '700' },
  error: { fontSize: font.body, color: colors.danger, marginTop: 6, lineHeight: 22 },
});

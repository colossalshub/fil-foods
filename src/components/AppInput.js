import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font, spacing } from '../theme/theme';

export default function AppInput({ label, error, secure, style, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error && styles.fieldError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.inactive}
          secureTextEntry={hidden}
          autoCapitalize="none"
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: font.sm, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, height: 44,
  },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: font.md, color: colors.text },
  error: { fontSize: font.xs, color: colors.danger, marginTop: 3 },
});

import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme/theme';

export default function AppButton({ title, onPress, variant = 'primary', loading, disabled, style, color }) {
  const outline = variant === 'outline';
  const tint = color || colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: tint },
        outline && [styles.outline, { borderColor: tint }],
        (disabled || loading) && { opacity: 0.6 }, pressed && { opacity: 0.85 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={outline ? tint : colors.white} />
        : <Text style={[styles.text, outline && { color: tint }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  text: { color: colors.white, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
});

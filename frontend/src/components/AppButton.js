import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme/theme';

export default function AppButton({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn, outline && styles.outline,
        (disabled || loading) && { opacity: 0.6 }, pressed && { opacity: 0.85 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={outline ? colors.primary : colors.white} />
        : <Text style={[styles.text, outline && { color: colors.primary }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { height: 46, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  text: { color: colors.white, fontSize: font.md, fontWeight: '600' },
});

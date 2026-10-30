import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font } from '../theme/theme';

export default function AppButton({ title, onPress, variant = 'primary', loading, disabled, style, color, icon }) {
  const outline = variant === 'outline';
  const tint = color || colors.primary;
  const labelColor = outline ? tint : colors.white;
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
      {loading ? <ActivityIndicator color={labelColor} /> : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={labelColor} /> : null}
          <Text style={[styles.text, { color: labelColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { color: colors.white, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
});

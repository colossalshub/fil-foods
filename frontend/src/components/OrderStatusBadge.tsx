import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '../theme/theme';
import { getStatusMeta } from '../services/trackingService';

const COLOR_MAP: Record<string, string> = {
  muted: colors.muted,
  warning: colors.warning,
  action: colors.action,
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
};

export default function OrderStatusBadge({ status, style }: { status: string; style?: StyleProp<ViewStyle> }) {
  const meta = getStatusMeta(status);
  const tint = COLOR_MAP[meta.colorKey] || colors.muted;
  return (
    <View
      style={[styles.wrap, { borderColor: tint, backgroundColor: colors.tint }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${meta.label}`}
    >
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <Text style={[styles.label, { color: tint }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: font.sm, fontWeight: '600' },
});

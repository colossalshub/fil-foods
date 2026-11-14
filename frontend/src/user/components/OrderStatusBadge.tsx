import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '../theme/theme';
import { getStatusMeta } from '../services/trackingService';

const FILL_STYLES: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
  muted: { backgroundColor: '#E8ECE9', color: '#4E5B52', borderColor: '#D6DDD5' },
  warning: { backgroundColor: '#F6E7B4', color: '#9A5B00', borderColor: '#E6CF7A' },
  action: { backgroundColor: '#DCEAD8', color: '#174D3A', borderColor: '#9BBF9A' },
  primary: { backgroundColor: '#DCEAD8', color: '#174D3A', borderColor: '#9BBF9A' },
  success: { backgroundColor: '#DCEAD8', color: '#174D3A', borderColor: '#9BBF9A' },
  danger: { backgroundColor: '#FBEAEA', color: colors.danger, borderColor: '#F5C2C0' },
};

export default function OrderStatusBadge({ status, style, variant = 'filled' }: {
  status: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'filled' | 'outline';
}) {
  const meta = getStatusMeta(status);
  const fill = FILL_STYLES[meta.colorKey] || FILL_STYLES.muted;

  if (variant === 'outline') {
    const tint = fill.color;
    return (
      <View
        style={[styles.outlineWrap, { borderColor: tint }, style]}
        accessibilityRole="text"
        accessibilityLabel={`Status: ${meta.label}`}
      >
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text style={[styles.label, { color: tint }]}>{meta.label}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.filledWrap,
        { backgroundColor: fill.backgroundColor, borderColor: fill.borderColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${meta.label}`}
    >
      <Text style={[styles.filledLabel, { color: fill.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filledWrap: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  filledLabel: { fontSize: font.sm, fontWeight: '700' },
  outlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: font.sm, fontWeight: '700' },
});
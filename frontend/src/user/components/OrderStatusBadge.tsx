import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing, fonts } from '../theme/theme';
import { getStatusMeta } from '../services/trackingService';

const FILL_STYLES: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
  muted: { backgroundColor: colors.soft, color: colors.muted, borderColor: colors.border },
  warning: { backgroundColor: colors.accent, color: colors.heading, borderColor: colors.accent },
  action: { backgroundColor: colors.soft, color: colors.primary, borderColor: colors.border },
  primary: { backgroundColor: colors.soft, color: colors.primary, borderColor: colors.border },
  success: { backgroundColor: colors.soft, color: colors.primary, borderColor: colors.border },
  danger: { backgroundColor: colors.white, color: colors.danger, borderColor: colors.danger },
};

export default function OrderStatusBadge({ status, style, variant = 'filled', prominent = false }: {
  status: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'filled' | 'outline';
  /** Stronger fill for a status the customer needs to act on, such as Ready for Pickup. */
  prominent?: boolean;
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

  const backgroundColor = prominent ? colors.primary : fill.backgroundColor;
  const borderColor = prominent ? colors.primaryDark : fill.borderColor;
  const textColor = prominent ? colors.white : fill.color;

  return (
    <View
      style={[
        styles.filledWrap,
        { backgroundColor, borderColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${meta.label}`}
    >
      <Text style={[styles.filledLabel, { color: textColor }]}>{meta.label}</Text>
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
  filledLabel: { fontFamily: fonts.bold, fontSize: font.sm },
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
  label: { fontFamily: fonts.bold, fontSize: font.sm },
});
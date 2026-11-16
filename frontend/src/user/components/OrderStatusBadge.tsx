import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing, fonts } from '../theme/theme';
import { getStatusMeta } from '../services/trackingService';

const FILL_STYLES: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
  muted: { backgroundColor: '#E8ECE9', color: colors.muted, borderColor: colors.border },
  warning: { backgroundColor: '#F6E7B4', color: colors.warning, borderColor: '#E6CF7A' },
  action: { backgroundColor: colors.mintStrong, color: colors.primary, borderColor: '#9BBF9A' },
  primary: { backgroundColor: colors.mintStrong, color: colors.primary, borderColor: '#9BBF9A' },
  success: { backgroundColor: colors.mintStrong, color: colors.primary, borderColor: '#9BBF9A' },
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
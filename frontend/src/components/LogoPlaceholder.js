import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, spacing } from '../theme/theme';

/**
 * Reserved brand area. Replace the mark inside this component with the official
 * F.I.L. FOODS logo later. Screens should not draw their own logo.
 */
export default function LogoPlaceholder({ label = 'F.I.L. FOODS' }) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="F.I.L. FOODS logo placeholder">
      <View style={styles.mark} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.soft,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: font.body,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: colors.primary,
  },
});
